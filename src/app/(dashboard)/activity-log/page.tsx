import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/profile";
import { listActivityLogs } from "@/server/services/activity-query";
import { Card } from "@/components/ui/card";
import { DataTable, Td, Th, Tr } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";

export default async function ActivityLogPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  const rows = await listActivityLogs(session.profile, 150);
  return (
    <div className="mx-auto max-w-[1280px] space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Log aktivitas</h1>
        <p className="text-sm text-mid-gray">
          {rows.length} entri terbaru · audit aksi staff
        </p>
      </div>
      <Card className="overflow-x-auto p-0">
        {!rows.length ? (
          <EmptyState
            title="Belum ada aktivitas"
            description="Kirim invoice, catat bayar, atau ubah master data — log muncul di sini."
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>Waktu</Th>
                <Th>Aksi</Th>
                <Th>Entitas</Th>
                <Th>Deskripsi</Th>
                <Th>Pelaku</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Tr key={r.id}>
                  <Td className="whitespace-nowrap text-mid-gray">
                    {new Date(r.created_at).toLocaleString("id-ID")}
                  </Td>
                  <Td className="font-medium">{r.action}</Td>
                  <Td>{r.entity_type}</Td>
                  <Td className="max-w-xs truncate" title={r.description}>
                    {r.description}
                  </Td>
                  <Td className="text-mid-gray">{r.actor_role ?? "SYSTEM"}</Td>
                </Tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </Card>
    </div>
  );
}
