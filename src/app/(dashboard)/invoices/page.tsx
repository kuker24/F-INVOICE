import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/profile";
import { listInvoices } from "@/server/services/invoices";
import { Card } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { formatIdr } from "@/lib/money/invoice-math";
import { ExportCsvButton } from "@/components/invoice/export-csv-button";

export default async function InvoicesPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  const rows = await listInvoices(session.profile);
  return (
    <div className="mx-auto max-w-[1280px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Invoice</h1>
        <div className="flex gap-2">
          <ExportCsvButton />
          <Link href="/invoices/new" className="inline-flex h-9 items-center rounded-[18px] bg-ink px-3 text-sm font-medium text-[#fafafa] hover:bg-ink-soft">+ Invoice</Link>
        </div>
      </div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-hairline text-left text-mid-gray">
            <tr>
              <th className="p-3">Nomor</th>
              <th className="p-3">Pelanggan</th>
              <th className="p-3">Status</th>
              <th className="p-3">Jatuh tempo</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3 text-right">Sisa</th>
            </tr>
          </thead>
          <tbody>
            {(rows as Array<Record<string, unknown>>).map((r) => {
              const cust = r.customers as { name?: string } | null;
              return (
                <tr key={String(r.id)} className="border-b border-hairline/60">
                  <td className="p-3">
                    <Link className="font-medium hover:underline" href={`/invoices/${r.id}`}>
                      {String(r.invoice_number)}
                    </Link>
                  </td>
                  <td className="p-3">{cust?.name ?? "—"}</td>
                  <td className="p-3">
                    <Badge tone={statusTone(String(r.status))}>{String(r.status)}</Badge>
                  </td>
                  <td className="p-3">{String(r.due_date)}</td>
                  <td className="p-3 text-right">{formatIdr(Number(r.total_amount))}</td>
                  <td className="p-3 text-right">{formatIdr(Number(r.balance_due))}</td>
                </tr>
              );
            })}
            {!rows.length ? (
              <tr><td colSpan={6} className="p-6 text-center text-mid-gray">Belum ada invoice.</td></tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
