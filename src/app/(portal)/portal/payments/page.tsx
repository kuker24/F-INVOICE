import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/profile";
import { listPortalPayments } from "@/server/services/payments";
import { listPortalInvoices } from "@/server/services/invoices";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { formatIdr } from "@/lib/money/invoice-math";
import { PortalPaymentForm } from "@/components/forms/portal-payment-form";

export default async function PortalPaymentsPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  const [rows, invoices] = await Promise.all([
    listPortalPayments(session.profile),
    listPortalInvoices(session.profile),
  ]);
  const open = invoices.filter((i) =>
    ["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"].includes(String(i.status)) &&
    Number(i.balance_due) > 0,
  );
  return (
    <div className="mx-auto max-w-[960px] space-y-4">
      <h1 className="text-xl font-semibold">Pembayaran saya</h1>
      <Card>
        <CardTitle className="mb-3">Konfirmasi bayar</CardTitle>
        <PortalPaymentForm
          invoices={open.map((i) => ({
            id: String(i.id),
            invoice_number: String(i.invoice_number),
            balance_due: Number(i.balance_due),
          }))}
        />
      </Card>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-hairline text-left text-mid-gray">
            <tr>
              <th className="p-3">Nomor</th>
              <th className="p-3">Invoice</th>
              <th className="p-3">Jumlah</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {(rows as Array<Record<string, unknown>>).map((r) => {
              const inv = r.invoices as { invoice_number?: string } | null;
              return (
                <tr key={String(r.id)} className="border-b border-hairline/60">
                  <td className="p-3">{String(r.payment_number)}</td>
                  <td className="p-3">{inv?.invoice_number ?? "—"}</td>
                  <td className="p-3">{formatIdr(Number(r.amount))}</td>
                  <td className="p-3"><Badge tone={statusTone(String(r.status))}>{String(r.status)}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
