import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { BillingCycle, Profile, Subscription } from "@/types/database";
import { ownerIdOf } from "@/lib/auth/owner";
import { assertStaff } from "@/lib/permissions/assert";
import { AppError } from "@/server/errors";
import { advanceBillingDate, addDays, todayInTz } from "@/lib/date/business";
import { createInvoice } from "@/server/services/invoices";
import { ensureBusinessSettings } from "@/server/services/settings";
import { logActivity, notifyUsers, staffUserIds } from "@/server/services/activity";

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

export async function listSubscriptions(profile: Profile) {
  assertStaff(profile);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*, customers(name)")
    .order("created_at", { ascending: false });
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

/** Core generate DRAFT invoice for one subscription period. Idempotent. */
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
  if (subscription.status !== "ACTIVE" && !profile) {
    throw new AppError("NOT_ACTIVE", "Langganan tidak aktif.");
  }

  const periodStart = subscription.next_invoice_date;
  const periodEnd = advanceBillingDate(
    periodStart,
    subscription.billing_cycle,
    subscription.custom_interval_days,
  );

  // idempotent check
  const { data: existing } = await admin
    .from("invoices")
    .select("id")
    .eq("subscription_id", subscription.id)
    .eq("subscription_period_start", periodStart)
    .is("deleted_at", null)
    .maybeSingle();
  if (existing) {
    return { invoiceId: existing.id as string, skipped: true };
  }

  const actor =
    profile ??
    ({
      id: subscription.created_by ?? subscription.owner_id,
      role: "DEVELOPER",
      status: "ACTIVE",
      owner_id: null,
      full_name: "System",
      email: "system@local",
      phone: null,
      avatar_url: null,
      customer_id: null,
      last_login_at: null,
      created_by: null,
      created_at: "",
      updated_at: "",
    } as Profile);

  // ensure owner for createInvoice
  if (!profile) {
    actor.id = subscription.owner_id;
    actor.role = "DEVELOPER";
  }

  const inv = await createInvoice(actor, {
    customer_id: subscription.customer_id,
    invoice_type: "SUBSCRIPTION",
    issue_date: periodStart,
    due_date: addDays(periodStart, subscription.due_days),
    template_id: subscription.template_id,
    payment_method_id: subscription.payment_method_id,
    items: [
      {
        product_id: subscription.product_id,
        name: subscription.name,
        description: subscription.description,
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

  // bump next_invoice_date
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
    description: `Generate DRAFT ${inv.invoice_number} for ${periodStart}`,
  });

  return { invoiceId: inv.id, skipped: false };
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
          title: "Invoice langganan DRAFT",
          message: `Langganan ${row.name} menghasilkan invoice draft.`,
          targetType: "subscription",
          targetId: row.id as string,
        });
      }
    } catch (e) {
      console.error("sub cron", row.id, e);
      errors++;
    }
  }
  return { generated, skipped, errors, scanned: rows?.length ?? 0 };
}
