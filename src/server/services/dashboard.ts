import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/types/database";
import { ownerIdOf } from "@/lib/auth/owner";
import { assertStaff } from "@/lib/permissions/assert";
import { ensureBusinessSettings } from "@/server/services/settings";

export async function getDashboardStats(profile: Profile) {
  assertStaff(profile);
  const ownerId = ownerIdOf(profile);
  const settings = await ensureBusinessSettings(ownerId);
  const admin = createAdminClient();

  const { count: customerCount } = await admin
    .from("customers")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId)
    .is("deleted_at", null);

  const { data: invoices } = await admin
    .from("invoices")
    .select("status,total_amount,balance_due,amount_paid")
    .eq("owner_id", ownerId)
    .is("deleted_at", null);

  const rows = invoices ?? [];
  const open = rows.filter((r) =>
    ["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"].includes(r.status as string),
  );
  const overdue = rows.filter((r) => r.status === "OVERDUE");
  const paidSum = rows
    .filter((r) => r.status === "PAID")
    .reduce((s, r) => s + Number(r.total_amount), 0);
  const outstanding = open.reduce((s, r) => s + Number(r.balance_due), 0);

  const showRevenue =
    profile.role === "DEVELOPER" || settings.show_revenue_to_admin;

  return {
    customers: customerCount ?? 0,
    invoices: rows.length,
    openInvoices: open.length,
    overdueInvoices: overdue.length,
    outstanding,
    revenue: showRevenue ? paidSum : null,
    showRevenue,
  };
}
