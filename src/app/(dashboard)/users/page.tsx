import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/profile";
import { listUsers } from "@/server/services/users";
import { listCustomers } from "@/server/services/customers";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { DataTable, Td, Th, Tr } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
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
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Pengguna</h1>
        <p className="text-sm text-mid-gray">
          {rows.length} akun · undang staff atau portal pelanggan
        </p>
      </div>
      <Card>
        <CardTitle className="mb-4">Undang user</CardTitle>
        <InviteUserForm
          canInviteAdmin={session.profile.role === "DEVELOPER"}
          customers={customers.map((c) => ({
            id: c.id,
            name: c.name,
            code: c.code,
          }))}
        />
      </Card>
      <Card className="overflow-x-auto p-0">
        {!rows.length ? (
          <EmptyState
            title="Belum ada pengguna"
            description="Undang admin atau pelanggan lewat form di atas."
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>Nama</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th>Aksi</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Tr key={r.id as string}>
                  <Td className="font-medium">{String(r.full_name)}</Td>
                  <Td className="text-mid-gray">{String(r.email)}</Td>
                  <Td>{String(r.role)}</Td>
                  <Td>
                    <Badge tone={statusTone(String(r.status))}>
                      {String(r.status)}
                    </Badge>
                  </Td>
                  <Td>
                    {r.role !== "DEVELOPER" ? (
                      <UserStatusButtons
                        id={String(r.id)}
                        status={String(r.status)}
                      />
                    ) : (
                      <span className="text-xs text-mid-gray">—</span>
                    )}
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
