import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/profile";
import { listPayments } from "@/server/services/payments";
import { Card } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DataTable, Td, Th, Tr } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatIdr } from "@/lib/money/invoice-math";
import { PaymentRowActions } from "@/components/payments/payment-row-actions";

export default async function PaymentsPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  const rows = await listPayments(session.profile);
  return (
    <div className="mx-auto max-w-[1280px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Pembayaran</h1>
          <p className="text-sm text-mid-gray">{rows.length} data</p>
        </div>
        <Link href="/payments/new" className={buttonVariants()}>
          + Catat bayar
        </Link>
      </div>
      <Card className="overflow-x-auto p-0">
        {!rows.length ? (
          <EmptyState
            title="Belum ada pembayaran"
            description="Catat pembayaran staff atau verifikasi konfirmasi pelanggan."
            actionHref="/payments/new"
            actionLabel="+ Catat bayar"
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>Nomor</Th>
                <Th>Invoice</Th>
                <Th>Pelanggan</Th>
                <Th align="right">Jumlah</Th>
                <Th>Status</Th>
                <Th>Source</Th>
                <Th>Aksi</Th>
              </tr>
            </thead>
            <tbody>
              {(rows as Array<Record<string, unknown>>).map((r) => {
                const inv = r.invoices as { invoice_number?: string } | null;
                const cust = r.customers as { name?: string } | null;
                return (
                  <Tr key={String(r.id)}>
                    <Td className="font-medium">{String(r.payment_number)}</Td>
                    <Td>{inv?.invoice_number ?? "—"}</Td>
                    <Td>{cust?.name ?? "—"}</Td>
                    <Td align="right">{formatIdr(Number(r.amount))}</Td>
                    <Td>
                      <Badge tone={statusTone(String(r.status))}>
                        {String(r.status)}
                      </Badge>
                    </Td>
                    <Td className="text-mid-gray">{String(r.source)}</Td>
                    <Td>
                      <PaymentRowActions
                        id={String(r.id)}
                        status={String(r.status)}
                      />
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
