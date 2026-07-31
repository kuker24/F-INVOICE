import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/profile";
import { listPortalSubscriptions } from "@/server/services/subscriptions";
import { Card } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { formatIdr } from "@/lib/money/invoice-math";

export default async function PortalSubsPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  const rows = await listPortalSubscriptions(session.profile);
  return (
    <div className="mx-auto max-w-[960px] space-y-4">
      <h1 className="text-xl font-semibold">Langganan saya</h1>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-hairline text-left text-mid-gray">
            <tr>
              <th className="p-3">Nama</th>
              <th className="p-3">Siklus</th>
              <th className="p-3">Harga</th>
              <th className="p-3">Next</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.id)} className="border-b border-hairline/60">
                <td className="p-3 font-medium">{String(r.name)}</td>
                <td className="p-3">{String(r.billing_cycle)}</td>
                <td className="p-3">{formatIdr(Number(r.price))}</td>
                <td className="p-3">{String(r.next_invoice_date)}</td>
                <td className="p-3"><Badge tone={statusTone(String(r.status))}>{String(r.status)}</Badge></td>
              </tr>
            ))}
            {!rows.length ? (
              <tr><td colSpan={5} className="p-6 text-center text-mid-gray">Kosong.</td></tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
