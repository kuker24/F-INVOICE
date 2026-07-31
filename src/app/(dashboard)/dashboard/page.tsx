import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/profile";
import { getDashboardStats } from "@/server/services/dashboard";
import { listMyNotifications } from "@/server/services/notifications";
import { Card, CardTitle } from "@/components/ui/card";
import { formatIdr } from "@/lib/money/invoice-math";

export default async function DashboardPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  const [stats, notes] = await Promise.all([
    getDashboardStats(session.profile),
    listMyNotifications(session.profile, 8),
  ]);

  return (
    <div className="mx-auto max-w-[1280px] space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-mid-gray">Halo, {session.profile.full_name}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardTitle className="text-sm text-mid-gray">Pelanggan</CardTitle>
          <p className="mt-2 text-2xl font-semibold">{stats.customers}</p>
        </Card>
        <Card>
          <CardTitle className="text-sm text-mid-gray">Invoice open</CardTitle>
          <p className="mt-2 text-2xl font-semibold">{stats.openInvoices}</p>
        </Card>
        <Card>
          <CardTitle className="text-sm text-mid-gray">Overdue</CardTitle>
          <p className="mt-2 text-2xl font-semibold text-ember">{stats.overdueInvoices}</p>
        </Card>
        <Card>
          <CardTitle className="text-sm text-mid-gray">Outstanding</CardTitle>
          <p className="mt-2 text-2xl font-semibold">{formatIdr(stats.outstanding)}</p>
        </Card>
        {stats.showRevenue ? (
          <Card className="sm:col-span-2">
            <CardTitle className="text-sm text-mid-gray">Revenue (PAID)</CardTitle>
            <p className="mt-2 text-2xl font-semibold">{formatIdr(stats.revenue ?? 0)}</p>
          </Card>
        ) : (
          <Card className="sm:col-span-2">
            <CardTitle className="text-sm text-mid-gray">Revenue</CardTitle>
            <p className="mt-2 text-sm text-mid-gray">Disembunyikan untuk Admin.</p>
          </Card>
        )}
      </div>
      <Card>
        <CardTitle className="mb-3">Notifikasi</CardTitle>
        <ul className="space-y-2 text-sm">
          {notes.map((n) => (
            <li key={n.id} className={n.is_read ? "text-mid-gray" : "text-ink"}>
              <span className="font-medium">{n.title}</span> — {n.message}
            </li>
          ))}
          {!notes.length ? <li className="text-mid-gray">Tidak ada notifikasi.</li> : null}
        </ul>
      </Card>
    </div>
  );
}
