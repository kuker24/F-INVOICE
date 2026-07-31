"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createCustomerAction,
  updateCustomerAction,
} from "@/server/actions/master";

type Props = {
  mode: "create" | "edit";
  id?: string;
  initial?: Record<string, string | null | undefined>;
};

export function CustomerForm({ mode, id, initial }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const raw = Object.fromEntries(fd.entries());
    start(async () => {
      const res =
        mode === "create"
          ? await createCustomerAction(raw)
          : await updateCustomerAction(id!, raw);
      if (!res.success) {
        setError(res.error.message);
        return;
      }
      router.push("/customers");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="code">Kode</Label>
          <Input id="code" name="code" required defaultValue={initial?.code ?? ""} />
        </div>
        <div>
          <Label htmlFor="name">Nama</Label>
          <Input id="name" name="name" required defaultValue={initial?.name ?? ""} />
        </div>
        <div>
          <Label htmlFor="type">Tipe</Label>
          <Select id="type" name="type" defaultValue={initial?.type ?? "INDIVIDUAL"}>
            <option value="INDIVIDUAL">Individu</option>
            <option value="COMPANY">Perusahaan</option>
            <option value="SCHOOL">Sekolah</option>
            <option value="OTHER">Lainnya</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={initial?.email ?? ""} />
        </div>
        <div>
          <Label htmlFor="phone">Telepon</Label>
          <Input id="phone" name="phone" defaultValue={initial?.phone ?? ""} />
        </div>
        <div>
          <Label htmlFor="city">Kota</Label>
          <Input id="city" name="city" defaultValue={initial?.city ?? ""} />
        </div>
      </div>
      <div>
        <Label htmlFor="address">Alamat</Label>
        <Textarea id="address" name="address" defaultValue={initial?.address ?? ""} />
      </div>
      <div>
        <Label htmlFor="notes">Catatan</Label>
        <Textarea id="notes" name="notes" defaultValue={initial?.notes ?? ""} />
      </div>
      {error ? <p className="text-sm text-ember">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Menyimpan…" : mode === "create" ? "Simpan" : "Update"}
      </Button>
    </form>
  );
}
