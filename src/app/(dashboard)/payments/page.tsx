import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/profile";
import { listPayments } from "@/server/services/payments";
import { Card } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DataTable, Td, Th, Tr } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSearch } from "@/components/ui/list-search";
import { formatIdr } from "@/lib/money/invoice-math";
import { PaymentRowActions } from "@/components/payments/payment-row-actions";

const STATUS_OPTS = [
  { value: "PENDING", label: "PENDING" },
  { value: "VERIFIED", label: "VERIFIED" },
  { value: "REJECTED", label: "REJECTED" },
  { value: "CANCELLED", label: "CANCELLED" },
];

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const status = sp.status?.trim() ?? "";
  const rows = await listPayments(session.profile, {
    q: q || undefined,
    status: status || undefined,
  });
  return (
    <div className="mx-auto max-w-[1280px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Pembayaran</h1>
          <p className="text-sm text-mid-gray">
            {rows.length} data
            {q || status
              ? ` · filter${q ? ` “${q}”` : ""}${status ? ` ${status}` : ""}`
              : ""}
          </p>
        </div>
        <Link href="/payments/new" className={buttonVariants()}>
          + Catat bayar
        </Link>
      </div>
      <ListSearch
        action="/payments"
        q={q}
        status={status}
        placeholder="Cari nomor bayar / referensi…"
        statusOptions={STATUS_OPTS}
      />
      <Card className="overflow-x-auto p-0">
        {!rows.length ? (
          <EmptyState
            title={q || status ? "Tidak ada hasil" : "Belum ada pembayaran"}
            description={
              q || status
                ? "Ubah filter atau reset."
                : "Catat pembayaran staff atau verifikasi konfirmasi pelanggan."
            }
            actionHref={q || status ? undefined : "/payments/new"}
            actionLabel={q || status ? undefined : "+ Catat bayar"}
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
