"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { InlineError } from "@/components/ui/inline-error";
import { cancelInvoiceAction, sendInvoiceAction } from "@/server/actions/invoices";

export function InvoiceActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<{ success: boolean; error?: { message: string } }>) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (!res.success) {
        setError(res.error?.message ?? "Gagal");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-2">
        {status === "DRAFT" ? (
          <Button disabled={pending} onClick={() => run(() => sendInvoiceAction(id))}>
            Kirim
          </Button>
        ) : null}
        {status !== "PAID" && status !== "CANCELLED" ? (
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() => {
              if (confirm("Batalkan invoice?")) run(() => cancelInvoiceAction(id));
            }}
          >
            Batalkan
          </Button>
        ) : null}
        {status !== "DRAFT" ? (
          <Button variant="outline" onClick={() => window.open(`/api/invoices/${id}/pdf`, "_blank")}>
            PDF
          </Button>
        ) : null}
      </div>
      <InlineError message={error} />
    </div>
  );
}
