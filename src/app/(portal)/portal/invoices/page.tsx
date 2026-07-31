import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/profile";
import { listPortalInvoices } from "@/server/services/invoices";
import { Card } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { formatIdr } from "@/lib/money/invoice-math";

export default async function PortalInvoicesPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  const rows = await listPortalInvoices(session.profile);
  return (
    <div className="mx-auto max-w-[960px] space-y-4">
      <h1 className="text-xl font-semibold">Invoice saya</h1>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-hairline text-left text-mid-gray">
            <tr>
              <th className="p-3">Nomor</th>
              <th className="p-3">Status</th>
              <th className="p-3">Jatuh tempo</th>
              <th className="p-3 text-right">Sisa</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.id)} className="border-b border-hairline/60">
                <td className="p-3 font-medium">{String(r.invoice_number)}</td>
                <td className="p-3"><Badge tone={statusTone(String(r.status))}>{String(r.status)}</Badge></td>
                <td className="p-3">{String(r.due_date)}</td>
                <td className="p-3 text-right">{formatIdr(Number(r.balance_due))}</td>
                <td className="p-3">
                  <Link className="underline" href={`/i/${r.public_token}`}>Buka</Link>
                  {" · "}
                  <Link className="underline" href={`/api/invoices/${r.id}/pdf`}>PDF</Link>
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr><td colSpan={5} className="p-6 text-center text-mid-gray">Belum ada invoice.</td></tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
