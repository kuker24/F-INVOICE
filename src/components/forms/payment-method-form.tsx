"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createPaymentMethodAction } from "@/server/actions/master";

export function PaymentMethodForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await createPaymentMethodAction({
        type: fd.get("type"),
        bank_name: fd.get("bank_name") || null,
        account_number: fd.get("account_number") || null,
        account_holder: fd.get("account_holder") || null,
        branch: fd.get("branch") || null,
        instructions: fd.get("instructions") || null,
        is_default: fd.get("is_default") === "on",
      });
      if (!res.success) { setError(res.error.message); return; }
      router.refresh();
      (e.target as HTMLFormElement).reset();
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-2xl gap-3 sm:grid-cols-2">
      <div>
        <Label>Tipe</Label>
        <Select name="type" defaultValue="BANK_TRANSFER">
          <option value="BANK_TRANSFER">Transfer bank</option>
          <option value="E_WALLET">E-wallet</option>
          <option value="CASH">Tunai</option>
          <option value="OTHER">Lainnya</option>
        </Select>
      </div>
      <div>
        <Label>Bank</Label>
        <Input name="bank_name" />
      </div>
      <div>
        <Label>No. rekening</Label>
        <Input name="account_number" />
      </div>
      <div>
        <Label>Atas nama</Label>
        <Input name="account_holder" />
      </div>
      <div className="sm:col-span-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_default" /> Default
        </label>
      </div>
      {error ? <p className="sm:col-span-2 text-sm text-ember">{error}</p> : null}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>{pending ? "…" : "Simpan"}</Button>
      </div>
    </form>
  );
}
