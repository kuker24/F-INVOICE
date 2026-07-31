import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/profile";
import { listProducts } from "@/server/services/products";
import { Card } from "@/components/ui/card";
import { formatIdr } from "@/lib/money/invoice-math";
import { Badge, statusTone } from "@/components/ui/badge";

export default async function ProductsPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  const rows = await listProducts(session.profile);
  return (
    <div className="mx-auto max-w-[1280px] space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Produk & Layanan</h1>
        <Link href="/products/new" className="inline-flex h-9 items-center rounded-[18px] bg-ink px-3 text-sm font-medium text-[#fafafa] hover:bg-ink-soft">+ Produk</Link>
      </div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-hairline text-left text-mid-gray">
            <tr>
              <th className="p-3">Kode</th>
              <th className="p-3">Nama</th>
              <th className="p-3">Harga</th>
              <th className="p-3">Billing</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-hairline/60">
                <td className="p-3 font-medium">{r.code}</td>
                <td className="p-3">{r.name}</td>
                <td className="p-3">{formatIdr(r.default_price)}</td>
                <td className="p-3">{r.billing_type}</td>
                <td className="p-3"><Badge tone={statusTone(r.status)}>{r.status}</Badge></td>
              </tr>
            ))}
            {!rows.length ? (
              <tr><td colSpan={5} className="p-6 text-center text-mid-gray">Belum ada produk.</td></tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
