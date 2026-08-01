import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { BillingCycle, Profile, Subscription } from "@/types/database";
import { ownerIdOf } from "@/lib/auth/owner";
import { assertStaff } from "@/lib/permissions/assert";
import { AppError } from "@/server/errors";
import { advanceBillingDate, addDays, todayInTz } from "@/lib/date/business";
import { createInvoice, sendInvoice } from "@/server/services/invoices";
import { ensureBusinessSettings } from "@/server/services/settings";
import { logActivity, notifyUsers, staffUserIds } from "@/server/services/activity";
import { sanitizeSearch } from "@/lib/search";

export type SubscriptionInput = {
  customer_id: string;
  product_id?: string | null;
  name: string;
  description?: string | null;
  billing_cycle: BillingCycle;
  custom_interval_days?: number | null;
  price: number;
  start_date: string;
  next_invoice_date?: string;
  end_date?: string | null;
  due_days?: number;
  auto_generate_invoice?: boolean;
  template_id?: string | null;
  payment_method_id?: string | null;
  internal_notes?: string | null;
};

export async function listSubscriptions(
  profile: Profile,
  opts?: { q?: string; status?: string },
) {
  assertStaff(profile);
  const supabase = await createClient();
  let query = supabase
    .from("subscriptions")
    .select(
      "id,name,billing_cycle,price,status,next_invoice_date,start_date,customer_id,created_at,customers(name)",
    )
    .order("created_at", { ascending: false });
  if (opts?.status?.trim()) {
    query = query.eq("status", opts.status.trim());
  }
  const term = sanitizeSearch(opts?.q);
  if (term) {
    query = query.ilike("name", `%${term}%`);
  }
  const { data, error } = await query;
  if (error) throw new AppError("LIST_FAILED", error.message);
  return data ?? [];
}

export async function listPortalSubscriptions(profile: Profile) {
  if (profile.role !== "USER" || !profile.customer_id) {
    throw new AppError("FORBIDDEN", "Portal only.");
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("id,name,billing_cycle,price,status,next_invoice_date,start_date")
    .eq("customer_id", profile.customer_id)
    .order("created_at", { ascending: false });
  if (error) throw new AppError("LIST_FAILED", error.message);
  return data ?? [];
}

export async function createSubscription(
  profile: Profile,
  input: SubscriptionInput,
) {
  assertStaff(profile);
  if (input.billing_cycle === "CUSTOM" && !input.custom_interval_days) {
    throw new AppError("CUSTOM_INTERVAL_REQUIRED", "Isi interval custom.");
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("subscriptions")
    .insert({
      owner_id: ownerIdOf(profile),
      customer_id: input.customer_id,
      product_id: input.product_id ?? null,
      name: input.name.trim(),
      description: input.description ?? null,
      billing_cycle: input.billing_cycle,
      custom_interval_days: input.custom_interval_days ?? null,
      price: input.price,
      start_date: input.start_date,
      next_invoice_date: input.next_invoice_date ?? input.start_date,
      end_date: input.end_date ?? null,
      due_days: input.due_days ?? 7,
      auto_generate_invoice: input.auto_generate_invoice ?? true,
      template_id: input.template_id ?? null,
      payment_method_id: input.payment_method_id ?? null,
      internal_notes: input.internal_notes ?? null,
      created_by: profile.id,
      status: "ACTIVE",
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("CREATE_FAILED", error?.message ?? "Gagal buat langganan.");
  }
  await logActivity({
    profile,
    action: "subscription.create",
    entityType: "subscription",
    entityId: data.id,
    description: `Buat langganan ${data.name}`,
  });
  return data as Subscription;
}

export async function updateSubscriptionStatus(
  profile: Profile,
  id: string,
  status: "ACTIVE" | "PAUSED" | "CANCELLED",
) {
  assertStaff(profile);
  const admin = createAdminClient();
  const patch: Record<string, unknown> = { status };
  if (status === "CANCELLED") patch.cancelled_at = new Date().toISOString();
  const { data, error } = await admin
    .from("subscriptions")
    .update(patch)
    .eq("id", id)
    .eq("owner_id", ownerIdOf(profile))
    .select("*")
    .single();
  if (error || !data) {
    throw new AppError("UPDATE_FAILED", error?.message ?? "Gagal update.");
  }
  await logActivity({
    profile,
    action: `subscription.${status.toLowerCase()}`,
    entityType: "subscription",
    entityId: id,
    description: `Status langganan → ${status}`,
  });
  return data as Subscription;
}

function systemActorForOwner(ownerId: string, createdBy?: string | null): Profile {
  return {
    id: ownerId,
    role: "DEVELOPER",
    status: "ACTIVE",
    owner_id: null,
    full_name: "System",
    email: "system@local",
    phone: null,
    avatar_url: null,
    customer_id: null,
    last_login_at: null,
    created_by: createdBy ?? null,
    created_at: "",
    updated_at: "",
  } as Profile;
}

/**
 * Generate invoice for the current subscription period, then auto-send (SENT)
 * so the linked customer portal user can see and pay it. Idempotent per period.
 */
export async function generateSubscriptionInvoice(
  profile: Profile | null,
  subscriptionId: string,
  opts?: { asSystem?: boolean; ownerId?: string },
) {
  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("subscriptions")
    .select("*")
    .eq("id", subscriptionId)
    .maybeSingle();
  if (!sub) throw new AppError("NOT_FOUND", "Langganan tidak ditemukan.");
  const subscription = sub as Subscription;
  if (profile && ownerIdOf(profile) !== subscription.owner_id) {
    throw new AppError("FORBIDDEN", "Di luar scope.");
  }
  if (!opts?.asSystem && profile) assertStaff(profile);
  if (subscription.status !== "ACTIVE") {
    throw new AppError("NOT_ACTIVE", "Langganan tidak aktif.");
  }

  const periodStart = subscription.next_invoice_date;
  const periodEnd = advanceBillingDate(
    periodStart,
    subscription.billing_cycle,
    subscription.custom_interval_days,
  );

  const actor = profile ?? systemActorForOwner(subscription.owner_id, subscription.created_by);

  // idempotent check — if a period invoice already exists, ensure it is sent
  const { data: existing } = await admin
    .from("invoices")
    .select("id,status,invoice_number")
    .eq("subscription_id", subscription.id)
    .eq("subscription_period_start", periodStart)
    .is("deleted_at", null)
    .maybeSingle();
  if (existing) {
    if (existing.status === "DRAFT") {
      const sent = await sendInvoice(actor, existing.id as string);
      return {
        invoiceId: sent.id,
        invoiceNumber: sent.invoice_number,
        status: sent.status,
        skipped: false,
      };
    }
    return {
      invoiceId: existing.id as string,
      invoiceNumber: existing.invoice_number as string,
      status: existing.status as string,
      skipped: true,
    };
  }

  // Prefer explicit sub settings; fall back to owner defaults so PDF/public match system.
  let templateId = subscription.template_id;
  let paymentMethodId = subscription.payment_method_id;
  if (!templateId) {
    const { data: defTmpl } = await admin
      .from("invoice_templates")
      .select("id")
      .eq("owner_id", subscription.owner_id)
      .eq("is_default", true)
      .eq("status", "ACTIVE")
      .maybeSingle();
    templateId = (defTmpl?.id as string) ?? null;
  }
  if (!paymentMethodId) {
    const { data: defPm } = await admin
      .from("payment_methods")
      .select("id")
      .eq("owner_id", subscription.owner_id)
      .eq("is_default", true)
      .eq("status", "ACTIVE")
      .maybeSingle();
    paymentMethodId = (defPm?.id as string) ?? null;
  }

  let itemName = subscription.name;
  let itemDescription =
    subscription.description ??
    `Langganan ${subscription.billing_cycle} · ${periodStart} s/d ${periodEnd}`;
  if (subscription.product_id) {
    const { data: product } = await admin
      .from("products")
      .select("name,description")
      .eq("id", subscription.product_id)
      .maybeSingle();
    if (product?.name) {
      itemName = product.name as string;
      itemDescription =
        (product.description as string | null) ??
        `${subscription.name} · ${periodStart} s/d ${periodEnd}`;
    }
  }

  const inv = await createInvoice(actor, {
    customer_id: subscription.customer_id,
    invoice_type: "SUBSCRIPTION",
    issue_date: periodStart,
    due_date: addDays(periodStart, subscription.due_days),
    template_id: templateId,
    payment_method_id: paymentMethodId,
    items: [
      {
        product_id: subscription.product_id,
        name: itemName,
        description: itemDescription,
        quantity: 1,
        unit_price: subscription.price,
        discount_amount: 0,
        tax_rate: 0,
      },
    ],
    subscription_id: subscription.id,
    subscription_period_start: periodStart,
    subscription_period_end: periodEnd,
  });

  // Deliver to customer portal (DRAFT is staff-only; portal hides DRAFT).
  const sent = await sendInvoice(actor, inv.id);

  // bump next_invoice_date only after successful create+send
  await admin
    .from("subscriptions")
    .update({ next_invoice_date: periodEnd })
    .eq("id", subscription.id);

  await logActivity({
    profile: profile ?? null,
    ownerId: subscription.owner_id,
    action: "subscription.generate_invoice",
    entityType: "subscription",
    entityId: subscription.id,
    description: `Generate & kirim ${sent.invoice_number} for ${periodStart}`,
  });

  return {
    invoiceId: sent.id,
    invoiceNumber: sent.invoice_number,
    status: sent.status,
    skipped: false,
  };
}

export async function runSubscriptionCron(limit = 50) {
  const admin = createAdminClient();
  // multi-owner: use each owner's timezone — default Jakarta for filter
  const today = todayInTz("Asia/Jakarta");
  const { data: rows } = await admin
    .from("subscriptions")
    .select("*")
    .eq("status", "ACTIVE")
    .eq("auto_generate_invoice", true)
    .lte("next_invoice_date", today)
    .limit(limit);

  let generated = 0;
  let skipped = 0;
  let errors = 0;
  for (const row of rows ?? []) {
    try {
      // refine by owner TZ
      const settings = await ensureBusinessSettings(row.owner_id as string);
      const localToday = todayInTz(settings.timezone);
      if ((row.next_invoice_date as string) > localToday) continue;
      const r = await generateSubscriptionInvoice(null, row.id as string, {
        asSystem: true,
      });
      if (r.skipped) skipped++;
      else {
        generated++;
        const staff = await staffUserIds(row.owner_id as string);
        await notifyUsers({
          userIds: staff,
          type: "SUBSCRIPTION_INVOICE",
          title: "Invoice langganan dikirim",
          message: `Langganan ${row.name}: ${r.invoiceNumber ?? r.invoiceId} (${r.status ?? "SENT"}).`,
          targetType: "invoice",
          targetId: r.invoiceId,
        });
      }
    } catch (e) {
      console.error("sub cron", row.id, e);
      errors++;
    }
  }
  return { generated, skipped, errors, scanned: rows?.length ?? 0 };
}
