import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/profile";
import { listPortalPayments } from "@/server/services/payments";
import { listPortalInvoices } from "@/server/services/invoices";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { DataTable, Td, Th, Tr } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatIdr } from "@/lib/money/invoice-math";
import { PortalPaymentForm } from "@/components/forms/portal-payment-form";

export default async function PortalPaymentsPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  const [rows, invoices] = await Promise.all([
    listPortalPayments(session.profile),
    listPortalInvoices(session.profile),
  ]);
  const open = invoices.filter(
    (i) =>
      ["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"].includes(String(i.status)) &&
      Number(i.balance_due) > 0,
  );
  return (
    <div className="mx-auto max-w-[960px] space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Pembayaran saya</h1>
        <p className="text-sm text-mid-gray">
          {rows.length} riwayat · konfirmasi transfer manual
        </p>
      </div>
      <Card>
        <CardTitle className="mb-3">Konfirmasi bayar</CardTitle>
        {open.length ? (
          <PortalPaymentForm
            invoices={open.map((i) => ({
              id: String(i.id),
              invoice_number: String(i.invoice_number),
              balance_due: Number(i.balance_due),
            }))}
          />
        ) : (
          <p className="text-sm text-mid-gray">
            Tidak ada tagihan terbuka. Invoice baru akan muncul di sini.
          </p>
        )}
      </Card>
      <Card className="overflow-x-auto p-0">
        {!rows.length ? (
          <EmptyState
            title="Belum ada pembayaran"
            description="Setelah konfirmasi transfer, status muncul di daftar ini."
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>Nomor</Th>
                <Th>Invoice</Th>
                <Th align="right">Jumlah</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {(rows as Array<Record<string, unknown>>).map((r) => {
                const inv = r.invoices as { invoice_number?: string } | null;
                return (
                  <Tr key={String(r.id)}>
                    <Td className="font-medium">{String(r.payment_number)}</Td>
                    <Td>{inv?.invoice_number ?? "—"}</Td>
                    <Td align="right">{formatIdr(Number(r.amount))}</Td>
                    <Td>
                      <Badge tone={statusTone(String(r.status))}>
                        {String(r.status)}
                      </Badge>
                    </Td>
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
