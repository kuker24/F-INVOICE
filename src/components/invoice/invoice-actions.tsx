"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cancelInvoiceAction, sendInvoiceAction } from "@/server/actions/invoices";

export function InvoiceActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function run(fn: () => Promise<{ success: boolean; error?: { message: string } }>) {
    start(async () => {
      const res = await fn();
      if (!res.success) alert(res.error?.message ?? "Gagal");
      router.refresh();
    });
  }

  return (
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
  );
}
