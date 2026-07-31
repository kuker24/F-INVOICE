import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/profile";
import { listInvoices } from "@/server/services/invoices";
import { Card } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DataTable, Td, Th, Tr } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatIdr } from "@/lib/money/invoice-math";
import { ExportCsvButton } from "@/components/invoice/export-csv-button";

export default async function InvoicesPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  const rows = await listInvoices(session.profile);
  return (
    <div className="mx-auto max-w-[1280px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Invoice</h1>
          <p className="text-sm text-mid-gray">{rows.length} data</p>
        </div>
        <div className="flex gap-2">
          <ExportCsvButton />
          <Link href="/invoices/new" className={buttonVariants()}>
            + Invoice
          </Link>
        </div>
      </div>
      <Card className="overflow-x-auto p-0">
        {!rows.length ? (
          <EmptyState
            title="Belum ada invoice"
            description="Buat draft invoice pertama untuk pelanggan."
            actionHref="/invoices/new"
            actionLabel="+ Invoice"
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>Nomor</Th>
                <Th>Pelanggan</Th>
                <Th>Status</Th>
                <Th>Jatuh tempo</Th>
                <Th align="right">Total</Th>
                <Th align="right">Sisa</Th>
              </tr>
            </thead>
            <tbody>
              {(rows as Array<Record<string, unknown>>).map((r) => {
                const cust = r.customers as { name?: string } | null;
                return (
                  <Tr key={String(r.id)}>
                    <Td>
                      <Link
                        className="font-medium underline-offset-2 hover:underline"
                        href={`/invoices/${r.id}`}
                      >
                        {String(r.invoice_number)}
                      </Link>
                    </Td>
                    <Td>{cust?.name ?? "—"}</Td>
                    <Td>
                      <Badge tone={statusTone(String(r.status))}>
                        {String(r.status)}
                      </Badge>
                    </Td>
                    <Td className="tabular-nums">{String(r.due_date)}</Td>
                    <Td align="right">{formatIdr(Number(r.total_amount))}</Td>
                    <Td align="right">{formatIdr(Number(r.balance_due))}</Td>
                  </Tr>
                );
              })}
            </tbody>
          </DataTable>
        )}
      </Card>
    </div>
  );
}
