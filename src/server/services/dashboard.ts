import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/types/database";
import { ownerIdOf } from "@/lib/auth/owner";
import { assertStaff } from "@/lib/permissions/assert";
import { ensureBusinessSettings } from "@/server/services/settings";

const OPEN = ["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"] as const;

export async function getDashboardStats(profile: Profile) {
  assertStaff(profile);
  const ownerId = ownerIdOf(profile);
  const admin = createAdminClient();

  const settingsP = ensureBusinessSettings(ownerId);
  const customersP = admin
    .from("customers")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId)
    .is("deleted_at", null);
  // Only money columns needed — not full invoice rows
  const invoicesP = admin
    .from("invoices")
    .select("status,total_amount,balance_due")
    .eq("owner_id", ownerId)
    .is("deleted_at", null);

  const [settings, customersRes, invoicesRes] = await Promise.all([
    settingsP,
    customersP,
    invoicesP,
  ]);

  const rows = invoicesRes.data ?? [];
  let openInvoices = 0;
  let overdueInvoices = 0;
  let outstanding = 0;
  let paidSum = 0;
  for (const r of rows) {
    const st = r.status as string;
    if ((OPEN as readonly string[]).includes(st)) {
      openInvoices += 1;
      outstanding += Number(r.balance_due);
    }
    if (st === "OVERDUE") overdueInvoices += 1;
    if (st === "PAID") paidSum += Number(r.total_amount);
  }

  const showRevenue =
    profile.role === "DEVELOPER" || settings.show_revenue_to_admin;

  return {
    customers: customersRes.count ?? 0,
    invoices: rows.length,
    openInvoices,
    overdueInvoices,
    outstanding,
    revenue: showRevenue ? paidSum : null,
    showRevenue,
  };
}
