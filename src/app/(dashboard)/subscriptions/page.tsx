import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/profile";
import { listSubscriptions } from "@/server/services/subscriptions";
import { Card } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { formatIdr } from "@/lib/money/invoice-math";
import { SubscriptionRowActions } from "@/components/subscriptions/row-actions";

export default async function SubscriptionsPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  const rows = await listSubscriptions(session.profile);
  return (
    <div className="mx-auto max-w-[1280px] space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Langganan</h1>
        <Link href="/subscriptions/new" className="inline-flex h-9 items-center rounded-[18px] bg-ink px-3 text-sm font-medium text-[#fafafa] hover:bg-ink-soft">+ Langganan</Link>
      </div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-hairline text-left text-mid-gray">
            <tr>
              <th className="p-3">Nama</th>
              <th className="p-3">Pelanggan</th>
              <th className="p-3">Siklus</th>
              <th className="p-3">Next</th>
              <th className="p-3">Harga</th>
              <th className="p-3">Status</th>
              <th className="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {(rows as Array<Record<string, unknown>>).map((r) => {
              const c = r.customers as { name?: string } | null;
              return (
                <tr key={String(r.id)} className="border-b border-hairline/60">
                  <td className="p-3 font-medium">{String(r.name)}</td>
                  <td className="p-3">{c?.name ?? "—"}</td>
                  <td className="p-3">{String(r.billing_cycle)}</td>
                  <td className="p-3">{String(r.next_invoice_date)}</td>
                  <td className="p-3">{formatIdr(Number(r.price))}</td>
                  <td className="p-3"><Badge tone={statusTone(String(r.status))}>{String(r.status)}</Badge></td>
                  <td className="p-3"><SubscriptionRowActions id={String(r.id)} status={String(r.status)} /></td>
                </tr>
              );
            })}
            {!rows.length ? (
              <tr><td colSpan={7} className="p-6 text-center text-mid-gray">Belum ada langganan.</td></tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
