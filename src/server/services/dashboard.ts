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
  const open = [...OPEN];

  const [
    settings,
    customersRes,
    openCnt,
    overdueCnt,
    openMoney,
    paidMoney,
  ] = await Promise.all([
    ensureBusinessSettings(ownerId),
    admin
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", ownerId)
      .is("deleted_at", null),
    admin
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", ownerId)
      .is("deleted_at", null)
      .in("status", open),
    admin
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", ownerId)
      .is("deleted_at", null)
      .eq("status", "OVERDUE"),
    admin
      .from("invoices")
      .select("balance_due")
      .eq("owner_id", ownerId)
      .is("deleted_at", null)
      .in("status", open),
    admin
      .from("invoices")
      .select("total_amount")
      .eq("owner_id", ownerId)
      .is("deleted_at", null)
      .eq("status", "PAID"),
  ]);

  let outstanding = 0;
  for (const r of openMoney.data ?? []) {
    outstanding += Number(r.balance_due);
  }
  let paidSum = 0;
  for (const r of paidMoney.data ?? []) {
    paidSum += Number(r.total_amount);
  }

  const showRevenue =
    profile.role === "DEVELOPER" || settings.show_revenue_to_admin;

  return {
    customers: customersRes.count ?? 0,
    invoices: (openCnt.count ?? 0) + (paidMoney.data?.length ?? 0),
    openInvoices: openCnt.count ?? 0,
    overdueInvoices: overdueCnt.count ?? 0,
    outstanding,
    revenue: showRevenue ? paidSum : null,
    showRevenue,
  };
}
