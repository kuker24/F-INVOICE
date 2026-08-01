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

  // Parallel head counts + narrow money cols only (no full invoice rows).
  const [settings, customersRes, openCnt, overdueCnt, openMoney, paidMoney, pendingPay] =
    await Promise.all([
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
      admin
        .from("payments")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", ownerId)
        .eq("status", "PENDING")
        .is("cancelled_at", null),
    ]);

  let outstanding = 0;
  for (const r of openMoney.data ?? []) {
    outstanding += Number(r.balance_due);
  }

  const showRevenue =
    profile.role === "DEVELOPER" || settings.show_revenue_to_admin;

  let paidSum: number | null = null;
  if (showRevenue) {
    paidSum = 0;
    for (const r of paidMoney.data ?? []) {
      paidSum += Number(r.total_amount);
    }
  }

  return {
    customers: customersRes.count ?? 0,
    openInvoices: openCnt.count ?? 0,
    overdueInvoices: overdueCnt.count ?? 0,
    pendingPayments: pendingPay.count ?? 0,
    outstanding,
    revenue: paidSum,
    showRevenue,
  };
}
