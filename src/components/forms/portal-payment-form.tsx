"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { submitPortalPaymentAction } from "@/server/actions/payments";

export function PortalPaymentForm({
  invoices,
}: {
  invoices: { id: string; invoice_number: string; balance_due: number }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await submitPortalPaymentAction({
        invoice_id: fd.get("invoice_id"),
        amount: Number(fd.get("amount")),
        payment_date: fd.get("payment_date"),
        method: fd.get("method") || null,
        sender_name: fd.get("sender_name") || null,
        reference_number: fd.get("reference_number") || null,
      });
      if (!res.success) { setError(res.error.message); return; }
      router.refresh();
    });
  }

  if (!invoices.length) {
    return <p className="text-sm text-mid-gray">Tidak ada invoice terbuka.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label>Invoice</Label>
        <Select name="invoice_id" required defaultValue={invoices[0]?.id}>
          {invoices.map((i) => (
            <option key={i.id} value={i.id}>{i.invoice_number} (sisa {i.balance_due})</option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Jumlah</Label>
        <Input name="amount" type="number" min={1} required />
      </div>
      <div>
        <Label>Tanggal</Label>
        <Input name="payment_date" type="date" defaultValue={today} required />
      </div>
      <div>
        <Label>Pengirim</Label>
        <Input name="sender_name" />
      </div>
      <div>
        <Label>Referensi</Label>
        <Input name="reference_number" />
      </div>
      {error ? <p className="sm:col-span-2 text-sm text-ember">{error}</p> : null}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>{pending ? "Mengirim…" : "Kirim konfirmasi"}</Button>
      </div>
    </form>
  );
}
