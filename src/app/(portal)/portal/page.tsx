import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/profile";
import { listPortalInvoices } from "@/server/services/invoices";
import { listMyNotifications } from "@/server/services/notifications";
import { Card, CardTitle } from "@/components/ui/card";
import { formatIdr } from "@/lib/money/invoice-math";

export default async function PortalHome() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  const [invoices, notes] = await Promise.all([
    listPortalInvoices(session.profile),
    listMyNotifications(session.profile, 5),
  ]);
  const open = invoices.filter((i) =>
    ["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"].includes(String(i.status)),
  );
  const outstanding = open.reduce((s, i) => s + Number(i.balance_due), 0);
  return (
    <div className="mx-auto max-w-[960px] space-y-4">
      <h1 className="text-xl font-semibold">Portal · {session.profile.full_name}</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardTitle className="text-sm text-mid-gray">Invoice open</CardTitle>
          <p className="mt-2 text-2xl font-semibold">{open.length}</p>
        </Card>
        <Card>
          <CardTitle className="text-sm text-mid-gray">Sisa tagihan</CardTitle>
          <p className="mt-2 text-2xl font-semibold">{formatIdr(outstanding)}</p>
        </Card>
      </div>
      <Card>
        <CardTitle className="mb-2">Notifikasi</CardTitle>
        <ul className="space-y-1 text-sm">
          {notes.map((n) => (
            <li key={n.id}>{n.title} — {n.message}</li>
          ))}
          {!notes.length ? <li className="text-mid-gray">Kosong</li> : null}
        </ul>
      </Card>
    </div>
  );
}
