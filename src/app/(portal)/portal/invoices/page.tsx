import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/profile";
import { listPortalInvoices } from "@/server/services/invoices";
import { Card } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DataTable, Td, Th, Tr } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatIdr } from "@/lib/money/invoice-math";
import { cn } from "@/lib/utils";

export default async function PortalInvoicesPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  const rows = await listPortalInvoices(session.profile);
  return (
    <div className="mx-auto max-w-[960px] space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Invoice saya</h1>
        <p className="text-sm text-mid-gray">{rows.length} data</p>
      </div>
      <Card className="overflow-x-auto p-0">
        {!rows.length ? (
          <EmptyState
            title="Belum ada invoice"
            description="Invoice dari penyedia akan muncul di sini."
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>Nomor</Th>
                <Th>Status</Th>
                <Th>Jatuh tempo</Th>
                <Th align="right">Sisa</Th>
                <Th>Aksi</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Tr key={String(r.id)}>
                  <Td className="font-medium">{String(r.invoice_number)}</Td>
                  <Td>
                    <Badge tone={statusTone(String(r.status))}>
                      {String(r.status)}
                    </Badge>
                  </Td>
                  <Td className="tabular-nums">{String(r.due_date)}</Td>
                  <Td align="right">{formatIdr(Number(r.balance_due))}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                        href={`/i/${r.public_token}`}
                      >
                        Buka
                      </Link>
                      <Link
                        className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                        href={`/api/invoices/${r.id}/pdf`}
                      >
                        PDF
                      </Link>
                    </div>
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
