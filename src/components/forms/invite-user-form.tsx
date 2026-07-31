"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { inviteUserAction } from "@/server/actions/users";

export function InviteUserForm({
  canInviteAdmin,
  customers,
}: {
  canInviteAdmin: boolean;
  customers: { id: string; name: string; code: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<"USER" | "ADMIN">("USER");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await inviteUserAction({
        email: fd.get("email"),
        full_name: fd.get("full_name"),
        role: fd.get("role"),
        customer_id: fd.get("customer_id") || null,
        phone: fd.get("phone") || null,
      });
      if (!res.success) { setError(res.error.message); return; }
      router.refresh();
      (e.target as HTMLFormElement).reset();
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
      <div>
        <Label>Nama</Label>
        <Input name="full_name" required />
      </div>
      <div>
        <Label>Email</Label>
        <Input name="email" type="email" required />
      </div>
      <div>
        <Label>Role</Label>
        <Select name="role" value={role} onChange={(e) => setRole(e.target.value as "USER" | "ADMIN")}>
          <option value="USER">USER</option>
          {canInviteAdmin ? <option value="ADMIN">ADMIN</option> : null}
        </Select>
      </div>
      {role === "USER" ? (
        <div>
          <Label>Customer</Label>
          <Select name="customer_id" required defaultValue="">
            <option value="" disabled>Pilih…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
            ))}
          </Select>
        </div>
      ) : (
        <input type="hidden" name="customer_id" value="" />
      )}
      {error ? <p className="sm:col-span-2 text-sm text-ember">{error}</p> : null}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>{pending ? "…" : "Undang"}</Button>
      </div>
    </form>
  );
}
