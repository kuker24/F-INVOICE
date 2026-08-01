import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Invoice, Payment, PaymentSource, Profile } from "@/types/database";
import { ownerIdOf } from "@/lib/auth/owner";
import { assertStaff } from "@/lib/permissions/assert";
import { AppError } from "@/server/errors";
import { recomputePaymentDrivenStatus, OPEN_FOR_PAYMENT } from "@/lib/invoice/status";
import { yearInTz, todayInTz } from "@/lib/date/business";
import { ensureBusinessSettings } from "@/server/services/settings";
import {
  logActivity,
  notifyUsers,
  staffUserIds,
  userIdsForCustomer,
} from "@/server/services/activity";
import { sanitizeSearch } from "@/lib/search";

async function nextPayNumber(ownerId: string, prefix: string, year: number) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("next_document_number", {
    p_owner_id: ownerId,
    p_prefix: prefix,
    p_year: year,
  });
  if (error || !data) {
    throw new AppError("SEQUENCE_FAILED", error?.message ?? "Gagal nomor bayar");
  }
  return data as string;
}

async function recomputeInvoice(admin: ReturnType<typeof createAdminClient>, invoiceId: string) {
  const { data: inv } = await admin
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!inv) throw new AppError("NOT_FOUND", "Invoice tidak ditemukan.");
  const invoice = inv as Invoice;

  const { data: pays } = await admin
    .from("payments")
    .select("amount")
    .eq("invoice_id", invoiceId)
    .eq("status", "VERIFIED");
  const amountPaid = (pays ?? []).reduce(
    (s, p) => s + Number(p.amount),
    0,
  );
  const settings = await ensureBusinessSettings(invoice.owner_id);
  const today = todayInTz(settings.timezone);
  const next = recomputePaymentDrivenStatus({
    amountPaid,
    totalAmount: invoice.total_amount,
    currentStatus: invoice.status,
    dueDate: invoice.due_date,
    today,
    sentAt: invoice.sent_at,
    viewedAt: invoice.viewed_at,
  });
  const balanceDue = Math.max(0, invoice.total_amount - amountPaid);
  await admin.rpc("rpc_set_invoice_bypass");
  const patch: Record<string, unknown> = {
    amount_paid: amountPaid,
    balance_due: balanceDue,
    status: next.status,
  };
  if (next.clearPaidAt) patch.paid_at = null;
  else if (next.paidAt) patch.paid_at = next.paidAt;

  const { data, error } = await admin
    .from("invoices")
    .update(patch)
    .eq("id", invoiceId)
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("RECOMPUTE_FAILED", error?.message ?? "Gagal recompute");
  }
  return data as Invoice;
}

export async function listPayments(
  profile: Profile,
  opts?: { q?: string; status?: string },
) {
  assertStaff(profile);
  const supabase = await createClient();
  let query = supabase
    .from("payments")
    .select(
      "id,invoice_id,customer_id,amount,payment_date,status,method,source,payment_number,created_at,invoices(invoice_number),customers(name)",
    )
    .order("created_at", { ascending: false });
  if (opts?.status?.trim()) {
    query = query.eq("status", opts.status.trim());
  }
  const t = sanitizeSearch(opts?.q);
  if (t) {
    query = query.or(
      `payment_number.ilike.%${t}%,reference_number.ilike.%${t}%`,
    );
  }
  const { data, error } = await query;
  if (error) throw new AppError("LIST_FAILED", error.message);
  return data ?? [];
}

export async function listPortalPayments(profile: Profile) {
  if (profile.role !== "USER" || !profile.customer_id) {
    throw new AppError("FORBIDDEN", "Portal only.");
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .select(
      "id,invoice_id,customer_id,amount,payment_date,status,method,source,created_at,invoices(invoice_number)",
    )
    .eq("customer_id", profile.customer_id)
    .order("created_at", { ascending: false });
  if (error) throw new AppError("LIST_FAILED", error.message);
  return data ?? [];
}

type CreatePaymentInput = {
  invoice_id: string;
  amount: number;
  payment_date: string;
  method?: string | null;
  sender_name?: string | null;
  reference_number?: string | null;
  notes?: string | null;
  proof_url?: string | null;
  source: PaymentSource;
  submitted_by?: string | null;
  verifyImmediately?: boolean;
  actor?: Profile | null;
  ownerId: string;
  customerId: string;
};

async function insertPayment(input: CreatePaymentInput) {
  const admin = createAdminClient();
  const { data: inv } = await admin
    .from("invoices")
    .select("*")
    .eq("id", input.invoice_id)
    .maybeSingle();
  if (!inv) throw new AppError("NOT_FOUND", "Invoice tidak ditemukan.");
  const invoice = inv as Invoice;
  if (invoice.owner_id !== input.ownerId) {
    throw new AppError("FORBIDDEN", "Invoice di luar scope.");
  }
  if (!OPEN_FOR_PAYMENT.includes(invoice.status) && input.source !== "staff") {
    throw new AppError("INVOICE_CLOSED", "Invoice tidak menerima pembayaran.");
  }
  if (invoice.status === "CANCELLED" || invoice.status === "DRAFT") {
    throw new AppError("INVOICE_CLOSED", "Invoice tidak menerima pembayaran.");
  }
  if (invoice.status === "PAID" && !input.verifyImmediately) {
    // staff may still? reject pending on paid
    throw new AppError("ALREADY_PAID", "Invoice sudah lunas.");
  }

  // overpay check against verified + this if verifying
  const { data: verified } = await admin
    .from("payments")
    .select("amount")
    .eq("invoice_id", invoice.id)
    .eq("status", "VERIFIED");
  const verifiedSum = (verified ?? []).reduce((s, p) => s + Number(p.amount), 0);
  if (input.verifyImmediately && verifiedSum + input.amount > invoice.total_amount) {
    throw new AppError(
      "PAYMENT_EXCEEDS_BALANCE",
      "Jumlah melebihi sisa tagihan.",
    );
  }
  if (!invoice.allow_partial_payment && input.amount < invoice.balance_due) {
    throw new AppError(
      "PARTIAL_NOT_ALLOWED",
      "Pembayaran parsial tidak diizinkan.",
    );
  }

  const settings = await ensureBusinessSettings(input.ownerId);
  const year = yearInTz(settings.timezone);
  const paymentNumber = await nextPayNumber(
    input.ownerId,
    settings.payment_prefix || "PAY",
    year,
  );

  const status = input.verifyImmediately ? "VERIFIED" : "PENDING";
  const { data: pay, error } = await admin
    .from("payments")
    .insert({
      owner_id: input.ownerId,
      invoice_id: input.invoice_id,
      customer_id: input.customerId,
      payment_number: paymentNumber,
      amount: input.amount,
      payment_date: input.payment_date,
      method: input.method ?? null,
      sender_name: input.sender_name ?? null,
      reference_number: input.reference_number ?? null,
      proof_url: input.proof_url ?? null,
      status,
      notes: input.notes ?? null,
      submitted_by: input.submitted_by ?? null,
      verified_by: input.verifyImmediately ? input.actor?.id ?? null : null,
      verified_at: input.verifyImmediately ? new Date().toISOString() : null,
      source: input.source,
    })
    .select("*")
    .single();
  if (error || !pay) {
    throw new AppError("CREATE_FAILED", error?.message ?? "Gagal catat bayar.");
  }

  if (status === "VERIFIED") {
    await recomputeInvoice(admin, invoice.id);
  }

  await logActivity({
    profile: input.actor ?? null,
    ownerId: input.ownerId,
    action: "payment.create",
    entityType: "payment",
    entityId: pay.id,
    description: `Pembayaran ${paymentNumber} (${status})`,
  });

  if (status === "PENDING") {
    const staff = await staffUserIds(input.ownerId);
    await notifyUsers({
      userIds: staff,
      type: "PAYMENT_PENDING",
      title: "Konfirmasi pembayaran",
      message: `Pembayaran ${paymentNumber} menunggu verifikasi.`,
      targetType: "payment",
      targetId: pay.id,
    });
  }

  return pay as Payment;
}

export async function recordPayment(
  profile: Profile,
  input: {
    invoice_id: string;
    amount: number;
    payment_date: string;
    method?: string | null;
    sender_name?: string | null;
    reference_number?: string | null;
    notes?: string | null;
    proof_url?: string | null;
    verify_immediately?: boolean;
  },
) {
  assertStaff(profile);
  const admin = createAdminClient();
  const { data: inv } = await admin
    .from("invoices")
    .select("customer_id,owner_id")
    .eq("id", input.invoice_id)
    .maybeSingle();
  if (!inv) throw new AppError("NOT_FOUND", "Invoice tidak ditemukan.");
  return insertPayment({
    ...input,
    source: "staff",
    submitted_by: profile.id,
    verifyImmediately: input.verify_immediately ?? false,
    actor: profile,
    ownerId: ownerIdOf(profile),
    customerId: inv.customer_id as string,
  });
}

export async function submitPortalPayment(
  profile: Profile,
  input: {
    invoice_id: string;
    amount: number;
    payment_date: string;
    method?: string | null;
    sender_name?: string | null;
    reference_number?: string | null;
    notes?: string | null;
    proof_url?: string | null;
  },
) {
  if (profile.role !== "USER" || !profile.customer_id) {
    throw new AppError("FORBIDDEN", "Portal only.");
  }
  const admin = createAdminClient();
  const { data: inv } = await admin
    .from("invoices")
    .select("*")
    .eq("id", input.invoice_id)
    .eq("customer_id", profile.customer_id)
    .maybeSingle();
  if (!inv) throw new AppError("NOT_FOUND", "Invoice tidak ditemukan.");
  return insertPayment({
    ...input,
    source: "portal",
    submitted_by: profile.id,
    verifyImmediately: false,
    actor: profile,
    ownerId: (inv as Invoice).owner_id,
    customerId: profile.customer_id,
  });
}

export async function submitPublicPayment(
  token: string,
  input: {
    amount: number;
    payment_date: string;
    method?: string | null;
    sender_name?: string | null;
    reference_number?: string | null;
    notes?: string | null;
    proof_url?: string | null;
  },
) {
  const admin = createAdminClient();
  const { data: inv } = await admin
    .from("invoices")
    .select("*")
    .eq("public_token", token)
    .is("deleted_at", null)
    .maybeSingle();
  if (!inv) throw new AppError("NOT_FOUND", "Invoice tidak ditemukan.");
  const invoice = inv as Invoice;
  if (invoice.status === "DRAFT") {
    throw new AppError("NOT_FOUND", "Invoice tidak ditemukan.");
  }
  return insertPayment({
    invoice_id: invoice.id,
    amount: input.amount,
    payment_date: input.payment_date,
    method: input.method,
    sender_name: input.sender_name,
    reference_number: input.reference_number,
    notes: input.notes,
    proof_url: input.proof_url,
    source: "public",
    submitted_by: null,
    verifyImmediately: false,
    actor: null,
    ownerId: invoice.owner_id,
    customerId: invoice.customer_id,
  });
}

export async function verifyPayment(profile: Profile, id: string) {
  assertStaff(profile);
  const admin = createAdminClient();
  const { data: pay } = await admin
    .from("payments")
    .select("*")
    .eq("id", id)
    .eq("owner_id", ownerIdOf(profile))
    .maybeSingle();
  if (!pay) throw new AppError("NOT_FOUND", "Pembayaran tidak ditemukan.");
  if ((pay as Payment).status !== "PENDING") {
    throw new AppError("INVALID_STATUS", "Hanya PENDING yang diverifikasi.");
  }
  const payment = pay as Payment;

  const { data: inv } = await admin
    .from("invoices")
    .select("*")
    .eq("id", payment.invoice_id)
    .maybeSingle();
  if (!inv) throw new AppError("NOT_FOUND", "Invoice tidak ditemukan.");
  const invoice = inv as Invoice;
  const { data: verified } = await admin
    .from("payments")
    .select("amount")
    .eq("invoice_id", invoice.id)
    .eq("status", "VERIFIED");
  const verifiedSum = (verified ?? []).reduce((s, p) => s + Number(p.amount), 0);
  if (verifiedSum + payment.amount > invoice.total_amount) {
    throw new AppError(
      "PAYMENT_EXCEEDS_BALANCE",
      "Jumlah melebihi sisa tagihan.",
    );
  }

  const { data: updated, error } = await admin
    .from("payments")
    .update({
      status: "VERIFIED",
      verified_by: profile.id,
      verified_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error || !updated) {
    throw new AppError("VERIFY_FAILED", error?.message ?? "Gagal verifikasi.");
  }
  await recomputeInvoice(admin, payment.invoice_id);
  await logActivity({
    profile,
    action: "payment.verify",
    entityType: "payment",
    entityId: id,
    description: `Verifikasi ${payment.payment_number}`,
  });
  const users = await userIdsForCustomer(payment.customer_id);
  await notifyUsers({
    userIds: users,
    type: "PAYMENT_VERIFIED",
    title: "Pembayaran diverifikasi",
    message: `Pembayaran ${payment.payment_number} diverifikasi.`,
    targetType: "payment",
    targetId: id,
  });
  return updated as Payment;
}

export async function rejectPayment(
  profile: Profile,
  id: string,
  reason: string,
) {
  assertStaff(profile);
  const admin = createAdminClient();
  const { data: pay } = await admin
    .from("payments")
    .select("*")
    .eq("id", id)
    .eq("owner_id", ownerIdOf(profile))
    .maybeSingle();
  if (!pay) throw new AppError("NOT_FOUND", "Pembayaran tidak ditemukan.");
  if ((pay as Payment).status !== "PENDING") {
    throw new AppError("INVALID_STATUS", "Hanya PENDING yang ditolak.");
  }
  const { data, error } = await admin
    .from("payments")
    .update({
      status: "REJECTED",
      rejection_reason: reason,
      verified_by: profile.id,
      verified_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("REJECT_FAILED", error?.message ?? "Gagal tolak.");
  }
  await logActivity({
    profile,
    action: "payment.reject",
    entityType: "payment",
    entityId: id,
    description: `Tolak ${(pay as Payment).payment_number}`,
  });
  const users = await userIdsForCustomer((pay as Payment).customer_id);
  await notifyUsers({
    userIds: users,
    type: "PAYMENT_REJECTED",
    title: "Pembayaran ditolak",
    message: reason || "Pembayaran ditolak.",
    targetType: "payment",
    targetId: id,
  });
  return data as Payment;
}

export async function cancelPayment(profile: Profile, id: string) {
  assertStaff(profile);
  const admin = createAdminClient();
  const { data: pay } = await admin
    .from("payments")
    .select("*")
    .eq("id", id)
    .eq("owner_id", ownerIdOf(profile))
    .maybeSingle();
  if (!pay) throw new AppError("NOT_FOUND", "Pembayaran tidak ditemukan.");
  const payment = pay as Payment;
  if (payment.status !== "VERIFIED" && payment.status !== "PENDING") {
    throw new AppError("INVALID_STATUS", "Status tidak bisa dibatalkan.");
  }
  const { data, error } = await admin
    .from("payments")
    .update({
      status: "CANCELLED",
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("CANCEL_FAILED", error?.message ?? "Gagal batalkan.");
  }
  if (payment.status === "VERIFIED") {
    await recomputeInvoice(admin, payment.invoice_id);
  }
  await logActivity({
    profile,
    action: "payment.cancel",
    entityType: "payment",
    entityId: id,
    description: `Batalkan ${payment.payment_number}`,
  });
  return data as Payment;
}
