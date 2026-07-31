import "server-only";
import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type {
  Invoice,
  InvoiceItem,
  InvoiceStatus,
  InvoiceType,
  Profile,
  PublicInvoiceDTO,
} from "@/types/database";
import { ownerIdOf } from "@/lib/auth/owner";
import { assertStaff } from "@/lib/permissions/assert";
import { AppError } from "@/server/errors";
import {
  computeInvoiceTotals,
  computeLine,
  toBigInt,
  toNumber,
} from "@/lib/money/invoice-math";
import { canUserTransition, OPEN_FOR_PAYMENT } from "@/lib/invoice/status";
import { todayInTz, yearInTz, addDays } from "@/lib/date/business";
import { ensureBusinessSettings } from "@/server/services/settings";
import {
  logActivity,
  notifyUsers,
  staffUserIds,
  userIdsForCustomer,
} from "@/server/services/activity";

export type LineInput = {
  product_id?: string | null;
  name: string;
  description?: string | null;
  quantity: number;
  unit?: string | null;
  unit_price: number;
  discount_amount?: number;
  tax_rate?: number;
};

export type InvoiceWriteInput = {
  customer_id: string;
  invoice_type?: InvoiceType;
  issue_date: string;
  due_date: string;
  discount_amount?: number;
  additional_fee?: number;
  allow_partial_payment?: boolean;
  template_id?: string | null;
  payment_method_id?: string | null;
  customer_notes?: string | null;
  internal_notes?: string | null;
  terms?: string | null;
  items: LineInput[];
  subscription_id?: string | null;
  subscription_period_start?: string | null;
  subscription_period_end?: string | null;
};

function publicToken() {
  return randomBytes(24).toString("base64url");
}

function calcItems(items: LineInput[]) {
  const computed = items.map((it, idx) => {
    const line = computeLine({
      quantity: it.quantity,
      unitPrice: toBigInt(it.unit_price),
      discountAmount: toBigInt(it.discount_amount ?? 0),
      taxRateBp: it.tax_rate ?? 0,
    });
    return {
      product_id: it.product_id ?? null,
      position: idx,
      name: it.name,
      description: it.description ?? null,
      quantity: it.quantity,
      unit: it.unit ?? null,
      unit_price: it.unit_price,
      discount_amount: it.discount_amount ?? 0,
      tax_rate: it.tax_rate ?? 0,
      tax_amount: toNumber(line.taxAmount),
      line_total: toNumber(line.lineTotal),
      afterDiscount: line.afterDiscount,
      taxAmount: line.taxAmount,
    };
  });
  return computed;
}

async function nextNumber(ownerId: string, prefix: string, year: number) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("next_document_number", {
    p_owner_id: ownerId,
    p_prefix: prefix,
    p_year: year,
  });
  if (error || !data) {
    throw new AppError("SEQUENCE_FAILED", error?.message ?? "Gagal nomor dokumen");
  }
  return data as string;
}

export async function listInvoices(
  profile: Profile,
  opts?: { status?: InvoiceStatus; q?: string },
) {
  assertStaff(profile);
  const supabase = await createClient();
  let query = supabase
    .from("invoices")
    .select("*, customers(name, code)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (opts?.status) query = query.eq("status", opts.status);
  if (opts?.q?.trim()) {
    query = query.ilike("invoice_number", `%${opts.q.trim()}%`);
  }
  const { data, error } = await query;
  if (error) throw new AppError("LIST_FAILED", error.message);
  return data ?? [];
}

export async function getInvoice(profile: Profile, id: string) {
  assertStaff(profile);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("*, customers(*), invoice_items(*)")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new AppError("GET_FAILED", error.message);
  if (!data) throw new AppError("NOT_FOUND", "Invoice tidak ditemukan.");
  return data;
}

export async function createInvoice(profile: Profile, input: InvoiceWriteInput) {
  assertStaff(profile);
  const ownerId = ownerIdOf(profile);
  const settings = await ensureBusinessSettings(ownerId);
  const lines = calcItems(input.items);
  const totals = computeInvoiceTotals(
    lines.map((l) => ({ afterDiscount: l.afterDiscount, taxAmount: l.taxAmount })),
    {
      discountAmount: toBigInt(input.discount_amount ?? 0),
      additionalFee: toBigInt(input.additional_fee ?? 0),
    },
  );
  const year = yearInTz(settings.timezone);
  const invoiceNumber = await nextNumber(
    ownerId,
    settings.invoice_prefix || "FINV",
    year,
  );
  const admin = createAdminClient();
  // bypass not needed for insert
  const { data: inv, error } = await admin
    .from("invoices")
    .insert({
      owner_id: ownerId,
      customer_id: input.customer_id,
      subscription_id: input.subscription_id ?? null,
      invoice_number: invoiceNumber,
      invoice_type: input.invoice_type ?? "PROJECT",
      issue_date: input.issue_date,
      due_date: input.due_date,
      status: "DRAFT",
      subtotal: toNumber(totals.subtotal),
      discount_amount: input.discount_amount ?? 0,
      tax_amount: toNumber(totals.taxAmount),
      additional_fee: input.additional_fee ?? 0,
      total_amount: toNumber(totals.totalAmount),
      amount_paid: 0,
      balance_due: toNumber(totals.totalAmount),
      allow_partial_payment: input.allow_partial_payment ?? true,
      template_id: input.template_id ?? null,
      payment_method_id: input.payment_method_id ?? null,
      customer_notes: input.customer_notes ?? settings.default_notes,
      internal_notes: input.internal_notes ?? null,
      terms: input.terms ?? settings.default_terms,
      public_token: publicToken(),
      created_by: profile.id,
      updated_by: profile.id,
      subscription_period_start: input.subscription_period_start ?? null,
      subscription_period_end: input.subscription_period_end ?? null,
    })
    .select("*")
    .single();
  if (error || !inv) {
    throw new AppError("CREATE_FAILED", error?.message ?? "Gagal buat invoice.");
  }
  const itemRows = lines.map((l) => ({
    invoice_id: inv.id,
    product_id: l.product_id,
    position: l.position,
    name: l.name,
    description: l.description,
    quantity: l.quantity,
    unit: l.unit,
    unit_price: l.unit_price,
    discount_amount: l.discount_amount,
    tax_rate: l.tax_rate,
    tax_amount: l.tax_amount,
    line_total: l.line_total,
  }));
  const { error: itemErr } = await admin.from("invoice_items").insert(itemRows);
  if (itemErr) {
    await admin.from("invoices").delete().eq("id", inv.id);
    throw new AppError("ITEMS_FAILED", itemErr.message);
  }
  await logActivity({
    profile,
    action: "invoice.create",
    entityType: "invoice",
    entityId: inv.id,
    description: `Buat invoice ${invoiceNumber}`,
  });
  return inv as Invoice;
}

export async function updateInvoiceDraft(
  profile: Profile,
  id: string,
  input: Partial<InvoiceWriteInput>,
) {
  assertStaff(profile);
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("invoices")
    .select("*")
    .eq("id", id)
    .eq("owner_id", ownerIdOf(profile))
    .maybeSingle();
  if (!existing) throw new AppError("NOT_FOUND", "Invoice tidak ditemukan.");
  if ((existing as Invoice).status !== "DRAFT") {
    throw new AppError("NOT_DRAFT", "Hanya DRAFT yang bisa diedit.");
  }

  let moneyPatch: Record<string, unknown> = {};
  if (input.items) {
    const lines = calcItems(input.items);
    const totals = computeInvoiceTotals(
      lines.map((l) => ({
        afterDiscount: l.afterDiscount,
        taxAmount: l.taxAmount,
      })),
      {
        discountAmount: toBigInt(
          input.discount_amount ?? (existing as Invoice).discount_amount,
        ),
        additionalFee: toBigInt(
          input.additional_fee ?? (existing as Invoice).additional_fee,
        ),
      },
    );
    await admin.rpc("rpc_set_invoice_bypass");
    moneyPatch = {
      subtotal: toNumber(totals.subtotal),
      discount_amount:
        input.discount_amount ?? (existing as Invoice).discount_amount,
      tax_amount: toNumber(totals.taxAmount),
      additional_fee:
        input.additional_fee ?? (existing as Invoice).additional_fee,
      total_amount: toNumber(totals.totalAmount),
      balance_due: toNumber(totals.totalAmount),
      amount_paid: 0,
    };
    await admin.from("invoice_items").delete().eq("invoice_id", id);
    await admin.from("invoice_items").insert(
      lines.map((l) => ({
        invoice_id: id,
        product_id: l.product_id,
        position: l.position,
        name: l.name,
        description: l.description,
        quantity: l.quantity,
        unit: l.unit,
        unit_price: l.unit_price,
        discount_amount: l.discount_amount,
        tax_rate: l.tax_rate,
        tax_amount: l.tax_amount,
        line_total: l.line_total,
      })),
    );
  }

  const content: Record<string, unknown> = {
    updated_by: profile.id,
  };
  for (const k of [
    "customer_id",
    "invoice_type",
    "issue_date",
    "due_date",
    "allow_partial_payment",
    "template_id",
    "payment_method_id",
    "customer_notes",
    "internal_notes",
    "terms",
  ] as const) {
    if (input[k] !== undefined) content[k] = input[k];
  }

  // money fields need bypass
  if (Object.keys(moneyPatch).length) {
    await admin.rpc("rpc_set_invoice_bypass");
  }
  const { data, error } = await admin
    .from("invoices")
    .update({ ...content, ...moneyPatch })
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) {
    // if guard blocked money without bypass, retry content-only then money via bypass
    throw new AppError("UPDATE_FAILED", error?.message ?? "Gagal update.");
  }
  await logActivity({
    profile,
    action: "invoice.update",
    entityType: "invoice",
    entityId: id,
    description: `Update draft ${(data as Invoice).invoice_number}`,
  });
  return data as Invoice;
}

export async function sendInvoice(profile: Profile, id: string) {
  assertStaff(profile);
  const admin = createAdminClient();
  const { data: inv } = await admin
    .from("invoices")
    .select("*")
    .eq("id", id)
    .eq("owner_id", ownerIdOf(profile))
    .maybeSingle();
  if (!inv) throw new AppError("NOT_FOUND", "Invoice tidak ditemukan.");
  const invoice = inv as Invoice;
  if (!canUserTransition(invoice.status, "SENT")) {
    throw new AppError("INVALID_TRANSITION", "Tidak bisa kirim dari status ini.");
  }
  await admin.rpc("rpc_set_invoice_bypass");
  const { data, error } = await admin
    .from("invoices")
    .update({
      status: "SENT",
      sent_at: new Date().toISOString(),
      updated_by: profile.id,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("SEND_FAILED", error?.message ?? "Gagal kirim.");
  }
  await logActivity({
    profile,
    action: "invoice.send",
    entityType: "invoice",
    entityId: id,
    description: `Kirim invoice ${invoice.invoice_number}`,
  });
  const users = await userIdsForCustomer(invoice.customer_id);
  await notifyUsers({
    userIds: users,
    type: "INVOICE_SENT",
    title: "Invoice baru",
    message: `Invoice ${invoice.invoice_number} telah dikirim.`,
    targetType: "invoice",
    targetId: id,
  });
  return data as Invoice;
}

export async function cancelInvoice(profile: Profile, id: string) {
  assertStaff(profile);
  const admin = createAdminClient();
  const { data: inv } = await admin
    .from("invoices")
    .select("*")
    .eq("id", id)
    .eq("owner_id", ownerIdOf(profile))
    .maybeSingle();
  if (!inv) throw new AppError("NOT_FOUND", "Invoice tidak ditemukan.");
  const invoice = inv as Invoice;
  if (!canUserTransition(invoice.status, "CANCELLED")) {
    throw new AppError("INVALID_TRANSITION", "Tidak bisa batalkan status ini.");
  }
  const { data: verified } = await admin
    .from("payments")
    .select("id")
    .eq("invoice_id", id)
    .eq("status", "VERIFIED")
    .limit(1);
  if (verified?.length) {
    throw new AppError(
      "HAS_VERIFIED_PAYMENTS",
      "Batalkan pembayaran terverifikasi dulu.",
    );
  }
  await admin.rpc("rpc_set_invoice_bypass");
  const { data, error } = await admin
    .from("invoices")
    .update({
      status: "CANCELLED",
      cancelled_at: new Date().toISOString(),
      updated_by: profile.id,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("CANCEL_FAILED", error?.message ?? "Gagal batalkan.");
  }
  await logActivity({
    profile,
    action: "invoice.cancel",
    entityType: "invoice",
    entityId: id,
    description: `Batalkan invoice ${invoice.invoice_number}`,
  });
  return data as Invoice;
}

export async function getPublicInvoiceByToken(
  token: string,
): Promise<PublicInvoiceDTO> {
  if (!token || token.length < 32) {
    throw new AppError("NOT_FOUND", "Invoice tidak ditemukan.");
  }
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

  // SENT → VIEWED once
  let displayStatus: InvoiceStatus = invoice.status;
  if (invoice.status === "SENT") {
    await admin.rpc("rpc_set_invoice_bypass");
    await admin
      .from("invoices")
      .update({
        status: "VIEWED",
        viewed_at: new Date().toISOString(),
      })
      .eq("id", invoice.id)
      .eq("status", "SENT");
    displayStatus = "VIEWED";
    await logActivity({
      ownerId: invoice.owner_id,
      action: "invoice.public_view",
      entityType: "invoice",
      entityId: invoice.id,
      description: `Public view ${invoice.invoice_number}`,
    });
  }

  const { data: items } = await admin
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", invoice.id)
    .order("position");
  const { data: customer } = await admin
    .from("customers")
    .select("name")
    .eq("id", invoice.customer_id)
    .maybeSingle();
  const { data: biz } = await admin
    .from("business_settings")
    .select("business_name")
    .eq("owner_id", invoice.owner_id)
    .maybeSingle();
  let payment_method: PublicInvoiceDTO["payment_method"] = null;
  if (invoice.payment_method_id) {
    const { data: pm } = await admin
      .from("payment_methods")
      .select("type,bank_name,account_number,account_holder,instructions")
      .eq("id", invoice.payment_method_id)
      .maybeSingle();
    if (pm) payment_method = pm as PublicInvoiceDTO["payment_method"];
  }

  return {
    invoice_number: invoice.invoice_number,
    status: displayStatus,
    issue_date: invoice.issue_date,
    due_date: invoice.due_date,
    currency: "IDR",
    subtotal: invoice.subtotal,
    discount_amount: invoice.discount_amount,
    tax_amount: invoice.tax_amount,
    additional_fee: invoice.additional_fee,
    total_amount: invoice.total_amount,
    amount_paid: invoice.amount_paid,
    balance_due: invoice.balance_due,
    allow_partial_payment: invoice.allow_partial_payment,
    customer_notes: invoice.customer_notes,
    terms: invoice.terms,
    customer_name: (customer?.name as string) ?? "",
    business_name: (biz?.business_name as string) ?? "F-INVOICE",
    items: ((items ?? []) as InvoiceItem[]).map((it) => ({
      name: it.name,
      description: it.description,
      quantity: it.quantity,
      unit: it.unit,
      unit_price: it.unit_price,
      discount_amount: it.discount_amount,
      tax_rate: it.tax_rate,
      tax_amount: it.tax_amount,
      line_total: it.line_total,
    })),
    payment_method,
  };
}

export async function listPortalInvoices(profile: Profile) {
  if (profile.role !== "USER" || !profile.customer_id) {
    throw new AppError("FORBIDDEN", "Portal only.");
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("id,invoice_number,status,issue_date,due_date,total_amount,amount_paid,balance_due,public_token")
    .eq("customer_id", profile.customer_id)
    .is("deleted_at", null)
    .neq("status", "DRAFT")
    .order("created_at", { ascending: false });
  if (error) throw new AppError("LIST_FAILED", error.message);
  return data ?? [];
}

export async function markOverdueBatch(today: string, limit = 100) {
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("invoices")
    .select("id,owner_id,customer_id,invoice_number,status")
    .in("status", ["SENT", "VIEWED", "PARTIALLY_PAID"])
    .lt("due_date", today)
    .is("deleted_at", null)
    .limit(limit);

  let processed = 0;
  for (const row of rows ?? []) {
    await admin.rpc("rpc_set_invoice_bypass");
    const { error } = await admin
      .from("invoices")
      .update({ status: "OVERDUE" })
      .eq("id", row.id)
      .in("status", ["SENT", "VIEWED", "PARTIALLY_PAID"]);
    if (error) continue;
    processed++;
    await logActivity({
      ownerId: row.owner_id as string,
      action: "invoice.overdue",
      entityType: "invoice",
      entityId: row.id as string,
      description: `Overdue ${row.invoice_number}`,
    });
    const staff = await staffUserIds(row.owner_id as string);
    const users = await userIdsForCustomer(row.customer_id as string);
    await notifyUsers({
      userIds: [...staff, ...users],
      type: "INVOICE_OVERDUE",
      title: "Invoice jatuh tempo",
      message: `Invoice ${row.invoice_number} OVERDUE.`,
      targetType: "invoice",
      targetId: row.id as string,
    });
  }
  return { processed, scanned: rows?.length ?? 0 };
}

export async function exportInvoicesCsv(profile: Profile) {
  assertStaff(profile);
  const rows = await listInvoices(profile);
  const header = [
    "invoice_number",
    "status",
    "issue_date",
    "due_date",
    "total_amount",
    "amount_paid",
    "balance_due",
    "customer",
  ];
  const lines = [header.join(",")];
  for (const r of rows as Array<Invoice & { customers?: { name?: string } }>) {
    const cust =
      r.customers && typeof r.customers === "object"
        ? (r.customers as { name?: string }).name ?? ""
        : "";
    lines.push(
      [
        r.invoice_number,
        r.status,
        r.issue_date,
        r.due_date,
        r.total_amount,
        r.amount_paid,
        r.balance_due,
        JSON.stringify(cust),
      ].join(","),
    );
  }
  return lines.join("\n");
}

export function defaultDueDate(issue: string, dueDays: number) {
  return addDays(issue, dueDays);
}

export function businessToday(tz?: string) {
  return todayInTz(tz ?? "Asia/Jakarta");
}

export { OPEN_FOR_PAYMENT };
