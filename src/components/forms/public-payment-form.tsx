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
        <div className="space-y-1.5">
          <Label htmlFor="pub-amount">Jumlah (IDR)</Label>
          <Input
            id="pub-amount"
            name="amount"
            type="number"
            min={1}
            max={maxAmount}
            required
            defaultValue={maxAmount}
            className="tabular-nums"
          />
          <p className="text-xs text-mid-gray">Maks. {maxAmount.toLocaleString("id-ID")}</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pub-date">Tanggal bayar</Label>
          <Input
            id="pub-date"
            name="payment_date"
            type="date"
            required
            defaultValue={today}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pub-sender">Nama pengirim</Label>
          <Input id="pub-sender" name="sender_name" autoComplete="name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pub-ref">No. referensi</Label>
          <Input id="pub-ref" name="reference_number" />
        </div>
      </div>
      {error ? (
        <p className="text-sm text-ember" role="alert">
          {error}
        </p>
      ) : null}
      {ok ? (
        <p className="text-sm text-ink" role="status">
          {ok}
        </p>
      ) : null}
      <Button type="submit" disabled={pending || maxAmount <= 0} className="w-full sm:w-auto">
        {pending ? "Mengirim…" : "Konfirmasi pembayaran"}
      </Button>
    </form>
  );
}
