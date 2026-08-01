import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/profile";
import { listSubscriptions } from "@/server/services/subscriptions";
import { Card } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DataTable, Td, Th, Tr } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSearch } from "@/components/ui/list-search";
import { formatIdr } from "@/lib/money/invoice-math";
import { SubscriptionRowActions } from "@/components/subscriptions/row-actions";

const STATUS_OPTS = [
  { value: "ACTIVE", label: "ACTIVE" },
  { value: "PAUSED", label: "PAUSED" },
  { value: "CANCELLED", label: "CANCELLED" },
  { value: "EXPIRED", label: "EXPIRED" },
];

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const status = sp.status?.trim() ?? "";
  const rows = await listSubscriptions(session.profile, {
    q: q || undefined,
    status: status || undefined,
  });
  return (
    <div className="mx-auto max-w-[1280px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Langganan</h1>
          <p className="text-sm text-mid-gray">
            {rows.length} data
            {q || status
              ? ` · filter${q ? ` “${q}”` : ""}${status ? ` ${status}` : ""}`
              : ""}
          </p>
        </div>
        <Link href="/subscriptions/new" className={buttonVariants()}>
          + Langganan
        </Link>
      </div>
      <ListSearch
        action="/subscriptions"
        q={q}
        status={status}
        placeholder="Cari nama langganan…"
        statusOptions={STATUS_OPTS}
      />
      <Card className="overflow-x-auto p-0">
        {!rows.length ? (
          <EmptyState
            title={q || status ? "Tidak ada hasil" : "Belum ada langganan"}
            description={
              q || status
                ? "Ubah filter atau reset."
                : "Buat langganan berulang; cron membuat & mengirim invoice ke pelanggan."
            }
            actionHref={q || status ? undefined : "/subscriptions/new"}
            actionLabel={q || status ? undefined : "+ Langganan"}
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>Nama</Th>
                <Th>Pelanggan</Th>
                <Th>Siklus</Th>
                <Th>Next</Th>
                <Th align="right">Harga</Th>
                <Th>Status</Th>
                <Th>Aksi</Th>
              </tr>
            </thead>
            <tbody>
              {(rows as Array<Record<string, unknown>>).map((r) => {
                const c = r.customers as { name?: string } | null;
                return (
                  <Tr key={String(r.id)}>
                    <Td className="font-medium">{String(r.name)}</Td>
                    <Td>{c?.name ?? "—"}</Td>
                    <Td>{String(r.billing_cycle)}</Td>
                    <Td className="tabular-nums">
                      {String(r.next_invoice_date)}
                    </Td>
                    <Td align="right">{formatIdr(Number(r.price))}</Td>
                    <Td>
                      <Badge tone={statusTone(String(r.status))}>
                        {String(r.status)}
                      </Badge>
                    </Td>
                    <Td>
                      <SubscriptionRowActions
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
