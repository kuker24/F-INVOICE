import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/profile";
import { listPortalSubscriptions } from "@/server/services/subscriptions";
import { Card } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { DataTable, Td, Th, Tr } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatIdr } from "@/lib/money/invoice-math";

export default async function PortalSubsPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  const rows = await listPortalSubscriptions(session.profile);
  return (
    <div className="mx-auto max-w-[960px] space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Langganan saya</h1>
        <p className="text-sm text-mid-gray">
          {rows.length} paket · siklus tagihan berulang
        </p>
      </div>
      <Card className="overflow-x-auto p-0">
        {!rows.length ? (
          <EmptyState
            title="Belum ada langganan"
            description="Langganan aktif dari penyedia akan tampil di sini."
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>Nama</Th>
                <Th>Siklus</Th>
                <Th align="right">Harga</Th>
                <Th>Next</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Tr key={String(r.id)}>
                  <Td className="font-medium">{String(r.name)}</Td>
                  <Td>{String(r.billing_cycle)}</Td>
                  <Td align="right">{formatIdr(Number(r.price))}</Td>
                  <Td className="tabular-nums">{String(r.next_invoice_date)}</Td>
                  <Td>
                    <Badge tone={statusTone(String(r.status))}>
                      {String(r.status)}
                    </Badge>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </Card>
    </div>
  );
}
