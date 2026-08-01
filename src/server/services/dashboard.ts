import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/types/database";
import { ownerIdOf } from "@/lib/auth/owner";
import { assertStaff } from "@/lib/permissions/assert";

const OPEN = ["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"] as const;
/** Cap app-side sum fallback when RPC missing (scale → apply dashboard_stats migration). */
const SUM_ROW_CAP = 5000;

export type DashboardStats = {
  customers: number;
  openInvoices: number;
  overdueInvoices: number;
  pendingPayments: number;
  outstanding: number;
  revenue: number | null;
  showRevenue: boolean;
  /** True when money totals may be incomplete (fallback hit row cap). */
  partial: boolean;
  error: string | null;
};

type RpcRow = {
  customers?: number;
  open_invoices?: number;
  overdue_invoices?: number;
  pending_payments?: number;
  outstanding?: number | string;
  revenue?: number | string | null;
};

async function statsViaRpc(
  admin: ReturnType<typeof createAdminClient>,
  ownerId: string,
  showRevenue: boolean,
): Promise<DashboardStats | null> {
  const { data, error } = await admin.rpc("dashboard_stats", {
    p_owner_id: ownerId,
    p_include_revenue: showRevenue,
  });
  if (error || data == null) return null;
  const row = (typeof data === "string" ? JSON.parse(data) : data) as RpcRow;
  return {
    customers: Number(row.customers ?? 0),
    openInvoices: Number(row.open_invoices ?? 0),
    overdueInvoices: Number(row.overdue_invoices ?? 0),
    pendingPayments: Number(row.pending_payments ?? 0),
    outstanding: Number(row.outstanding ?? 0),
    revenue: showRevenue ? Number(row.revenue ?? 0) : null,
    showRevenue,
    partial: false,
    error: null,
  };
}

async function statsViaSelect(
  admin: ReturnType<typeof createAdminClient>,
  ownerId: string,
  showRevenue: boolean,
): Promise<DashboardStats> {
  const open = [...OPEN];
  const [customersRes, openCnt, overdueCnt, openMoney, pendingPay, paidRows] =
    await Promise.all([
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
        .in("status", open)
        .limit(SUM_ROW_CAP),
      admin
        .from("payments")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", ownerId)
        .eq("status", "PENDING")
        .is("cancelled_at", null),
      showRevenue
        ? admin
            .from("invoices")
            .select("total_amount")
            .eq("owner_id", ownerId)
            .is("deleted_at", null)
            .eq("status", "PAID")
            .limit(SUM_ROW_CAP)
        : Promise.resolve({ data: null as { total_amount: number }[] | null }),
    ]);

  let outstanding = 0;
  const openRows = openMoney.data ?? [];
  for (const r of openRows) outstanding += Number(r.balance_due);

  let revenue: number | null = null;
  const paid = paidRows.data ?? [];
  if (showRevenue) {
    revenue = 0;
    for (const r of paid) revenue += Number(r.total_amount);
  }

  const partial =
    openRows.length >= SUM_ROW_CAP ||
    (showRevenue && paid.length >= SUM_ROW_CAP);

  return {
    customers: customersRes.count ?? 0,
    openInvoices: openCnt.count ?? 0,
    overdueInvoices: overdueCnt.count ?? 0,
    pendingPayments: pendingPay.count ?? 0,
    outstanding,
    revenue,
    showRevenue,
    partial,
    error: null,
  };
}

export async function getDashboardStats(
  profile: Profile,
): Promise<DashboardStats> {
  assertStaff(profile);
  const ownerId = ownerIdOf(profile);
  const admin = createAdminClient();
  const isDeveloper = profile.role === "DEVELOPER";

  let showRevenue = isDeveloper;
  if (!isDeveloper) {
    const { data: settings } = await admin
      .from("business_settings")
      .select("show_revenue_to_admin")
      .eq("owner_id", ownerId)
      .maybeSingle();
    showRevenue = Boolean(
      (settings as { show_revenue_to_admin?: boolean } | null)
        ?.show_revenue_to_admin,
    );
  }

  try {
    const viaRpc = await statsViaRpc(admin, ownerId, showRevenue);
    if (viaRpc) return viaRpc;
    return await statsViaSelect(admin, ownerId, showRevenue);
  } catch (e) {
    return {
      customers: 0,
      openInvoices: 0,
      overdueInvoices: 0,
      pendingPayments: 0,
      outstanding: 0,
      revenue: showRevenue ? 0 : null,
      showRevenue,
      partial: false,
      error: e instanceof Error ? e.message : "Gagal memuat statistik",
    };
  }
}
