"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PublicPaymentForm({ token, maxAmount }: { token: string; maxAmount: number }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(null);
    const fd = new FormData(e.currentTarget);
    const body = {
      amount: Number(fd.get("amount")),
      payment_date: String(fd.get("payment_date")),
      method: String(fd.get("method") || "") || null,
      sender_name: String(fd.get("sender_name") || "") || null,
      reference_number: String(fd.get("reference_number") || "") || null,
      notes: String(fd.get("notes") || "") || null,
    };
    start(async () => {
      const res = await fetch(`/api/public/invoices/${token}/payment-confirmation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Gagal");
        return;
      }
      setOk(`Terkirim ${json.data.payment_number} (PENDING)`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Jumlah (maks {maxAmount})</Label>
          <Input name="amount" type="number" min={1} max={maxAmount} required defaultValue={maxAmount} />
        </div>
        <div>
          <Label>Tanggal</Label>
          <Input name="payment_date" type="date" required defaultValue={today} />
        </div>
        <div>
          <Label>Nama pengirim</Label>
          <Input name="sender_name" />
        </div>
        <div>
          <Label>Referensi</Label>
          <Input name="reference_number" />
        </div>
      </div>
      {error ? <p className="text-sm text-ember">{error}</p> : null}
      {ok ? <p className="text-sm text-ink">{ok}</p> : null}
      <Button type="submit" disabled={pending || maxAmount <= 0}>
        {pending ? "Mengirim…" : "Konfirmasi pembayaran"}
      </Button>
    </form>
  );
}
