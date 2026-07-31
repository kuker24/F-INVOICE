"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateOwnProfileAction } from "@/server/actions/users";

export function ProfileForm({
  initial,
}: {
  initial: { full_name: string; phone: string | null };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await updateOwnProfileAction({
        full_name: fd.get("full_name"),
        phone: fd.get("phone") || null,
      });
      if (!res.success) { setError(res.error.message); return; }
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <Label>Nama</Label>
        <Input name="full_name" defaultValue={initial.full_name} required />
      </div>
      <div>
        <Label>Telepon</Label>
        <Input name="phone" defaultValue={initial.phone ?? ""} />
      </div>
      {error ? <p className="text-sm text-ember">{error}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "…" : "Simpan"}</Button>
    </form>
  );
}
