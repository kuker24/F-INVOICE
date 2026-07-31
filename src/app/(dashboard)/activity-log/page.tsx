import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/profile";
import { listActivityLogs } from "@/server/services/activity-query";
import { Card } from "@/components/ui/card";

export default async function ActivityLogPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  const rows = await listActivityLogs(session.profile, 150);
  return (
    <div className="mx-auto max-w-[1280px] space-y-4">
      <h1 className="text-xl font-semibold">Activity log</h1>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-hairline text-left text-mid-gray">
            <tr>
              <th className="p-3">Waktu</th>
              <th className="p-3">Aksi</th>
              <th className="p-3">Entity</th>
              <th className="p-3">Deskripsi</th>
              <th className="p-3">Actor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-hairline/60">
                <td className="p-3 whitespace-nowrap text-mid-gray">
                  {new Date(r.created_at).toLocaleString("id-ID")}
                </td>
                <td className="p-3 font-medium">{r.action}</td>
                <td className="p-3">{r.entity_type}</td>
                <td className="p-3">{r.description}</td>
                <td className="p-3">{r.actor_role ?? "SYSTEM"}</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr><td colSpan={5} className="p-6 text-center text-mid-gray">Kosong.</td></tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
