import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/profile";
import { listCustomers } from "@/server/services/customers";
import { Card } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DataTable, Td, Th, Tr } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  const sp = await searchParams;
  const rows = await listCustomers(session.profile, sp.q);

  return (
    <div className="mx-auto max-w-[1280px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Pelanggan</h1>
          <p className="text-sm text-mid-gray">{rows.length} data</p>
        </div>
        <Link href="/customers/new" className={buttonVariants()}>
          + Pelanggan
        </Link>
      </div>
      <Card className="overflow-x-auto p-0">
        {!rows.length ? (
          <EmptyState
            title="Belum ada pelanggan"
            description="Tambah master pelanggan sebelum membuat invoice."
            actionHref="/customers/new"
            actionLabel="+ Pelanggan"
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>Kode</Th>
                <Th>Nama</Th>
                <Th>Email</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Tr key={r.id}>
                  <Td>
                    <Link
                      className="font-medium underline-offset-2 hover:underline"
                      href={`/customers/${r.id}`}
                    >
                      {r.code}
                    </Link>
                  </Td>
                  <Td>{r.name}</Td>
                  <Td className="text-mid-gray">{r.email ?? "—"}</Td>
                  <Td>
                    <Badge tone={statusTone(r.status)}>{r.status}</Badge>
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
