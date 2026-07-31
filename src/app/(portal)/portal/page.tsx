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
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Portal · {session.profile.full_name}
        </h1>
        <p className="text-sm text-mid-gray">Ringkasan tagihan dan notifikasi</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm text-mid-gray">Invoice open</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
            {open.length}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-mid-gray">Sisa tagihan</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
            {formatIdr(outstanding)}
          </p>
        </Card>
      </div>
      <Card>
        <CardTitle className="mb-2">Notifikasi</CardTitle>
        {notes.length ? (
          <ul className="space-y-1.5 text-sm">
            {notes.map((n) => (
              <li key={n.id}>
                <span className="font-medium">{n.title}</span> — {n.message}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-mid-gray">
            Belum ada notifikasi. Status invoice baru akan tampil di sini.
          </p>
        )}
      </Card>
    </div>
  );
}
