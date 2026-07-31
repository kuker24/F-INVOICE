import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/profile";
import { listUsers } from "@/server/services/users";
import { listCustomers } from "@/server/services/customers";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { InviteUserForm } from "@/components/forms/invite-user-form";
import { UserStatusButtons } from "@/components/users/status-buttons";

export default async function UsersPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  const [rows, customers] = await Promise.all([
    listUsers(session.profile),
    listCustomers(session.profile),
  ]);
  return (
    <div className="mx-auto max-w-[1280px] space-y-6">
      <h1 className="text-xl font-semibold">Pengguna</h1>
      <Card>
        <CardTitle className="mb-4">Undang user</CardTitle>
        <InviteUserForm
          canInviteAdmin={session.profile.role === "DEVELOPER"}
          customers={customers.map((c) => ({ id: c.id, name: c.name, code: c.code }))}
        />
      </Card>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-hairline text-left text-mid-gray">
            <tr>
              <th className="p-3">Nama</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
              <th className="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id as string} className="border-b border-hairline/60">
                <td className="p-3 font-medium">{String(r.full_name)}</td>
                <td className="p-3">{String(r.email)}</td>
                <td className="p-3">{String(r.role)}</td>
                <td className="p-3"><Badge tone={statusTone(String(r.status))}>{String(r.status)}</Badge></td>
                <td className="p-3">
                  {r.role !== "DEVELOPER" ? (
                    <UserStatusButtons id={String(r.id)} status={String(r.status)} />
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
