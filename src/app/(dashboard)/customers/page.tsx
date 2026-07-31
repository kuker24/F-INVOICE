import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/profile";
import { listCustomers } from "@/server/services/customers";
import { Card } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";

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
        <Link href="/customers/new" className="inline-flex h-9 items-center rounded-[18px] bg-ink px-3 text-sm font-medium text-[#fafafa] hover:bg-ink-soft">+ Pelanggan</Link>
      </div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-hairline text-left text-mid-gray">
            <tr>
              <th className="p-3 font-medium">Kode</th>
              <th className="p-3 font-medium">Nama</th>
              <th className="p-3 font-medium">Email</th>
              <th className="p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-hairline/60 hover:bg-canvas/60">
                <td className="p-3">
                  <Link className="font-medium underline-offset-2 hover:underline" href={`/customers/${r.id}`}>
                    {r.code}
                  </Link>
                </td>
                <td className="p-3">{r.name}</td>
                <td className="p-3 text-mid-gray">{r.email ?? "—"}</td>
                <td className="p-3">
                  <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-mid-gray">
                  Belum ada pelanggan.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
