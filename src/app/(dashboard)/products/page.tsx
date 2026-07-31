import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/profile";
import { listProducts } from "@/server/services/products";
import { Card } from "@/components/ui/card";
import { formatIdr } from "@/lib/money/invoice-math";
import { Badge, statusTone } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DataTable, Td, Th, Tr } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";

export default async function ProductsPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  const rows = await listProducts(session.profile);
  return (
    <div className="mx-auto max-w-[1280px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Produk & Layanan</h1>
          <p className="text-sm text-mid-gray">{rows.length} data</p>
        </div>
        <Link href="/products/new" className={buttonVariants()}>
          + Produk
        </Link>
      </div>
      <Card className="overflow-x-auto p-0">
        {!rows.length ? (
          <EmptyState
            title="Belum ada produk"
            description="Definisikan item atau layanan untuk dipakai di invoice."
            actionHref="/products/new"
            actionLabel="+ Produk"
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>Kode</Th>
                <Th>Nama</Th>
                <Th align="right">Harga</Th>
                <Th>Billing</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Tr key={r.id}>
                  <Td className="font-medium">{r.code}</Td>
                  <Td>{r.name}</Td>
                  <Td align="right">{formatIdr(r.default_price)}</Td>
                  <Td>{r.billing_type}</Td>
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
