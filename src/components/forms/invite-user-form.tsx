"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [role, setRole] = useState<"USER" | "ADMIN">("ADMIN");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOkMsg(null);
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirm") ?? "");
    if (password !== confirm) {
      setError("Password dan konfirmasi tidak sama.");
      return;
    }
    if (password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }
    start(async () => {
      const res = await inviteUserAction({
        email: fd.get("email"),
        full_name: fd.get("full_name"),
        role: fd.get("role"),
        password,
        customer_id: fd.get("customer_id") || null,
        phone: fd.get("phone") || null,
      });
      if (!res.success) {
        setError(res.error.message);
        return;
      }
      setOkMsg("User aktif. Beri email + password ke mereka untuk login.");
      router.refresh();
      (e.target as HTMLFormElement).reset();
      setRole(canInviteAdmin ? "ADMIN" : "USER");
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
      <div>
        <Label htmlFor="full_name">Nama</Label>
        <Input id="full_name" name="full_name" required disabled={pending} />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          disabled={pending}
          autoComplete="off"
        />
      </div>
      <div>
        <Label htmlFor="role">Role</Label>
        <Select
          id="role"
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value as "USER" | "ADMIN")}
          disabled={pending}
        >
          {canInviteAdmin ? <option value="ADMIN">ADMIN</option> : null}
          <option value="USER">USER (portal pelanggan)</option>
        </Select>
      </div>
      {role === "USER" ? (
        <div>
          <Label htmlFor="customer_id">Customer</Label>
          {customers.length === 0 ? (
            <p className="mt-1 text-sm text-mid-gray">
              Belum ada pelanggan.{" "}
              <Link
                href="/customers/new"
                className="font-medium text-ink underline-offset-4 hover:underline"
              >
                Buat pelanggan dulu
              </Link>
              .
            </p>
          ) : (
            <Select
              id="customer_id"
              name="customer_id"
              required
              defaultValue=""
              disabled={pending}
            >
              <option value="" disabled>
                Pilih…
              </option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </Select>
          )}
        </div>
      ) : (
        <input type="hidden" name="customer_id" value="" />
      )}
      <div>
        <Label htmlFor="password">Password awal</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          disabled={pending}
          autoComplete="new-password"
          placeholder="Minimal 8 karakter"
        />
      </div>
      <div>
        <Label htmlFor="confirm">Ulangi password</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          required
          minLength={8}
          disabled={pending}
          autoComplete="new-password"
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="phone">Telepon (opsional)</Label>
        <Input id="phone" name="phone" disabled={pending} />
      </div>
      {error ? (
        <p className="sm:col-span-2 text-sm text-ember" role="alert">
          {error}
        </p>
      ) : null}
      {okMsg ? (
        <p className="sm:col-span-2 text-sm text-ink" role="status">
          {okMsg}
        </p>
      ) : null}
      <div className="sm:col-span-2">
        <Button
          type="submit"
          disabled={pending || (role === "USER" && customers.length === 0)}
        >
          {pending ? "Membuat…" : "Buat user"}
        </Button>
      </div>
    </form>
  );
}
