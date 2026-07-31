"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createSubscriptionAction } from "@/server/actions/subscriptions";

export function SubscriptionForm({ customers }: { customers: { id: string; name: string; code: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const raw = Object.fromEntries(fd.entries());
    start(async () => {
      const res = await createSubscriptionAction({
        ...raw,
        price: Number(raw.price),
        due_days: Number(raw.due_days || 7),
        custom_interval_days: raw.custom_interval_days ? Number(raw.custom_interval_days) : null,
        auto_generate_invoice: raw.auto_generate_invoice === "on",
      });
      if (!res.success) { setError(res.error.message); return; }
      router.push("/subscriptions");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>Pelanggan</Label>
          <Select name="customer_id" required defaultValue="">
            <option value="" disabled>Pilih…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
            ))}
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label>Nama</Label>
          <Input name="name" required />
        </div>
        <div>
          <Label>Siklus</Label>
          <Select name="billing_cycle" defaultValue="MONTHLY">
            <option value="MONTHLY">Bulanan</option>
            <option value="QUARTERLY">3 bulanan</option>
            <option value="SEMIANNUAL">6 bulanan</option>
            <option value="YEARLY">Tahunan</option>
            <option value="CUSTOM">Custom</option>
          </Select>
        </div>
        <div>
          <Label>Interval custom (hari)</Label>
          <Input name="custom_interval_days" type="number" min={1} />
        </div>
        <div>
          <Label>Harga</Label>
          <Input name="price" type="number" min={0} required defaultValue={0} />
        </div>
        <div>
          <Label>Due days</Label>
          <Input name="due_days" type="number" min={0} defaultValue={7} />
        </div>
        <div>
          <Label>Mulai</Label>
          <Input name="start_date" type="date" required defaultValue={today} />
        </div>
        <div>
          <Label>Next invoice</Label>
          <Input name="next_invoice_date" type="date" defaultValue={today} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="auto_generate_invoice" defaultChecked />
        Auto generate invoice
      </label>
      {error ? <p className="text-sm text-ember">{error}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "…" : "Simpan"}</Button>
    </form>
  );
}
