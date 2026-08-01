"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateBusinessSettingsAction } from "@/server/actions/master";
import type { BusinessSettings } from "@/types/database";

export function BusinessSettingsForm({ initial }: { initial: BusinessSettings }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(false);
    const fd = new FormData(e.currentTarget);
    const raw = Object.fromEntries(fd.entries());
    start(async () => {
      const res = await updateBusinessSettingsAction({
        ...raw,
        default_due_days: Number(raw.default_due_days || 7),
        show_revenue_to_admin: raw.show_revenue_to_admin === "on",
      });
      if (!res.success) { setError(res.error.message); return; }
      setOk(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-2xl gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label>Nama bisnis</Label>
        <Input name="business_name" defaultValue={initial.business_name} required />
      </div>
      <div>
        <Label>Email</Label>
        <Input name="email" defaultValue={initial.email ?? ""} />
      </div>
      <div>
        <Label>Telepon</Label>
        <Input name="phone" defaultValue={initial.phone ?? ""} />
      </div>
      <div className="sm:col-span-2">
        <Label>Alamat</Label>
        <Textarea name="address" defaultValue={initial.address ?? ""} />
      </div>
      <div>
        <Label>Kota</Label>
        <Input name="city" defaultValue={initial.city ?? ""} />
      </div>
      <div>
        <Label>Timezone</Label>
        <Input name="timezone" defaultValue={initial.timezone} />
      </div>
      <div>
        <Label>Prefix invoice</Label>
        <Input name="invoice_prefix" defaultValue={initial.invoice_prefix} />
      </div>
      <div>
        <Label>Prefix payment</Label>
        <Input name="payment_prefix" defaultValue={initial.payment_prefix} />
      </div>
      <div>
        <Label>Default due days</Label>
        <Input name="default_due_days" type="number" defaultValue={initial.default_due_days} />
      </div>
      <div className="flex items-end">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="show_revenue_to_admin" defaultChecked={initial.show_revenue_to_admin} />
          Tampilkan revenue ke Admin
        </label>
      </div>
      <div className="sm:col-span-2">
        <Label>Default terms</Label>
        <Textarea name="default_terms" defaultValue={initial.default_terms ?? ""} />
      </div>
      {error ? <p className="sm:col-span-2 text-sm text-ember">{error}</p> : null}
      {ok ? <p className="sm:col-span-2 text-sm">Tersimpan.</p> : null}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>{pending ? "Menyimpan…" : "Simpan"}</Button>
      </div>
    </form>
  );
}
