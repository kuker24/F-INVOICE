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
import { ListSearch } from "@/components/ui/list-search";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const rows = await listProducts(session.profile, q || undefined);
  return (
    <div className="mx-auto max-w-[1280px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Produk & Layanan
          </h1>
          <p className="text-sm text-mid-gray">
            {rows.length} data
            {q ? ` · filter “${q}”` : ""}
          </p>
        </div>
        <Link href="/products/new" className={buttonVariants()}>
          + Produk
        </Link>
      </div>
      <ListSearch
        action="/products"
        q={q}
        placeholder="Cari nama atau kode produk…"
      />
      <Card className="overflow-x-auto p-0">
        {!rows.length ? (
          <EmptyState
            title={q ? "Tidak ada hasil" : "Belum ada produk"}
            description={
              q
                ? `Tidak ada produk yang cocok dengan “${q}”.`
                : "Definisikan item atau layanan untuk dipakai di invoice."
            }
            actionHref={q ? undefined : "/products/new"}
            actionLabel={q ? undefined : "+ Produk"}
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
