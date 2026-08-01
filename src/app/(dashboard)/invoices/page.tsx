import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/profile";
import { listInvoices } from "@/server/services/invoices";
import { Card } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DataTable, Td, Th, Tr } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSearch } from "@/components/ui/list-search";
import { formatIdr } from "@/lib/money/invoice-math";
import { ExportCsvButton } from "@/components/invoice/export-csv-button";
import type { InvoiceStatus } from "@/types/database";

const STATUS_OPTS = [
  { value: "OPEN", label: "Terbuka" },
  { value: "DRAFT", label: "DRAFT" },
  { value: "SENT", label: "SENT" },
  { value: "VIEWED", label: "VIEWED" },
  { value: "PARTIALLY_PAID", label: "PARTIALLY_PAID" },
  { value: "PAID", label: "PAID" },
  { value: "OVERDUE", label: "OVERDUE" },
  { value: "CANCELLED", label: "CANCELLED" },
];

type InvoiceFilter = InvoiceStatus | "OPEN";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const status = sp.status?.trim() ?? "";
  const statusFilter =
    status === "OPEN" || STATUS_OPTS.some((o) => o.value === status)
      ? (status as InvoiceFilter)
      : undefined;
  const rows = await listInvoices(session.profile, {
    q: q || undefined,
    status: statusFilter,
  });
  return (
    <div className="mx-auto max-w-[1280px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Invoice</h1>
          <p className="text-sm text-mid-gray">
            {rows.length} data
            {q || status
              ? ` · filter${q ? ` “${q}”` : ""}${status ? ` ${status}` : ""}`
              : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <ExportCsvButton />
          <Link href="/invoices/new" className={buttonVariants()}>
            + Invoice
          </Link>
        </div>
      </div>
      <ListSearch
        action="/invoices"
        q={q}
        status={status}
        placeholder="Cari nomor invoice…"
        statusOptions={STATUS_OPTS}
      />
      <Card className="overflow-x-auto p-0">
        {!rows.length ? (
          <EmptyState
            title={q || status ? "Tidak ada hasil" : "Belum ada invoice"}
            description={
              q || status
                ? "Ubah kata kunci atau status, atau reset filter."
                : "Buat draft invoice pertama untuk pelanggan."
            }
            actionHref={q || status ? undefined : "/invoices/new"}
            actionLabel={q || status ? undefined : "+ Invoice"}
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
