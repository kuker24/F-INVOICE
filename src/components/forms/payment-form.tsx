"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { recordPaymentAction } from "@/server/actions/payments";

export function PaymentForm({ invoices }: { invoices: { id: string; invoice_number: string; balance_due: number }[] }) {
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
      const res = await recordPaymentAction({
        invoice_id: raw.invoice_id,
        amount: Number(raw.amount),
        payment_date: raw.payment_date,
        method: raw.method || null,
        sender_name: raw.sender_name || null,
        reference_number: raw.reference_number || null,
        notes: raw.notes || null,
        verify_immediately: raw.verify_immediately === "on",
      });
      if (!res.success) { setError(res.error.message); return; }
      router.push("/payments");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-xl space-y-4">
      <div>
        <Label>Invoice</Label>
        <Select name="invoice_id" required defaultValue="">
          <option value="" disabled>Pilih…</option>
          {invoices.map((i) => (
            <option key={i.id} value={i.id}>{i.invoice_number} (sisa {i.balance_due})</option>
          ))}
        </Select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Jumlah</Label>
          <Input name="amount" type="number" min={1} required />
        </div>
        <div>
          <Label>Tanggal</Label>
          <Input name="payment_date" type="date" required defaultValue={today} />
        </div>
        <div>
          <Label>Metode</Label>
          <Input name="method" />
        </div>
        <div>
          <Label>Pengirim</Label>
          <Input name="sender_name" />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="verify_immediately" />
        Verifikasi langsung
      </label>
      {error ? <p className="text-sm text-ember">{error}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "…" : "Catat"}</Button>
    </form>
  );
}
