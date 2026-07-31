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
          <p className="text-sm text-mid-gray">Pelanggan</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
            {stats.customers}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-mid-gray">Invoice open</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
            {stats.openInvoices}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-mid-gray">Overdue</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-ember">
            {stats.overdueInvoices}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-mid-gray">Outstanding</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
            {formatIdr(stats.outstanding)}
          </p>
        </Card>
        {stats.showRevenue ? (
          <Card className="sm:col-span-2">
            <p className="text-sm text-mid-gray">Revenue (PAID)</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
              {formatIdr(stats.revenue ?? 0)}
            </p>
          </Card>
        ) : (
          <Card className="sm:col-span-2">
            <p className="text-sm text-mid-gray">Revenue</p>
            <p className="mt-2 text-sm text-mid-gray">Disembunyikan untuk Admin.</p>
          </Card>
        )}
      </div>
      <Card>
        <CardTitle className="mb-3">Notifikasi</CardTitle>
        {notes.length ? (
          <ul className="space-y-2 text-sm">
            {notes.map((n) => (
              <li key={n.id} className={n.is_read ? "text-mid-gray" : "text-ink"}>
                <span className="font-medium">{n.title}</span> — {n.message}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-mid-gray">
            Tidak ada notifikasi. Aktivitas invoice dan pembayaran akan muncul di sini.
          </p>
        )}
      </Card>
    </div>
  );
}
