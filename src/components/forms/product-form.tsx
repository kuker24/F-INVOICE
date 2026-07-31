"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createProductAction,
  updateProductAction,
} from "@/server/actions/master";

type Props = {
  mode: "create" | "edit";
  id?: string;
  initial?: Record<string, string | number | null | undefined>;
};

export function ProductForm({ mode, id, initial }: Props) {
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
          ? await createProductAction(raw)
          : await updateProductAction(id!, raw);
      if (!res.success) {
        setError(res.error.message);
        return;
      }
      router.push("/products");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="code">Kode</Label>
          <Input id="code" name="code" required defaultValue={String(initial?.code ?? "")} />
        </div>
        <div>
          <Label htmlFor="name">Nama</Label>
          <Input id="name" name="name" required defaultValue={String(initial?.name ?? "")} />
        </div>
        <div>
          <Label htmlFor="default_price">Harga default (IDR)</Label>
          <Input
            id="default_price"
            name="default_price"
            type="number"
            min={0}
            required
            defaultValue={String(initial?.default_price ?? 0)}
          />
        </div>
        <div>
          <Label htmlFor="default_tax_rate">Pajak (bp, 1100=11%)</Label>
          <Input
            id="default_tax_rate"
            name="default_tax_rate"
            type="number"
            min={0}
            defaultValue={String(initial?.default_tax_rate ?? 0)}
          />
        </div>
        <div>
          <Label htmlFor="billing_type">Jenis bayar</Label>
          <Select
            id="billing_type"
            name="billing_type"
            defaultValue={String(initial?.billing_type ?? "ONE_TIME")}
          >
            <option value="ONE_TIME">Sekali</option>
            <option value="MONTHLY">Bulanan</option>
            <option value="QUARTERLY">3 bulanan</option>
            <option value="SEMIANNUAL">6 bulanan</option>
            <option value="YEARLY">Tahunan</option>
            <option value="CUSTOM">Custom</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="unit">Unit</Label>
          <Input id="unit" name="unit" defaultValue={String(initial?.unit ?? "")} />
        </div>
      </div>
      <div>
        <Label htmlFor="description">Deskripsi</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={String(initial?.description ?? "")}
        />
      </div>
      {error ? <p className="text-sm text-ember">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Menyimpan…" : "Simpan"}
      </Button>
    </form>
  );
}
