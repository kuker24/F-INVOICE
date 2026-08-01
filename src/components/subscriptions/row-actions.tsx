"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { InlineError } from "@/components/ui/inline-error";
import {
  cancelSubscriptionAction,
  generateSubscriptionInvoiceAction,
  pauseSubscriptionAction,
  resumeSubscriptionAction,
} from "@/server/actions/subscriptions";

type GenData = {
  invoiceId: string;
  invoiceNumber?: string;
  status?: string;
  skipped?: boolean;
};

export function SubscriptionRowActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [lastInvoice, setLastInvoice] = useState<GenData | null>(null);

  function go(fn: () => Promise<{ success: boolean; error?: { message: string }; data?: unknown }>) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (!res.success) {
        setError(res.error?.message ?? "Gagal");
        return;
      }
      if (res.data && typeof res.data === "object" && "invoiceId" in (res.data as object)) {
        setLastInvoice(res.data as GenData);
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-1">
        <Button
          size="sm"
          variant="outline"
          disabled={pending || status !== "ACTIVE"}
          onClick={() => go(() => generateSubscriptionInvoiceAction(id))}
          title={
            status === "ACTIVE"
              ? "Buat & kirim invoice ke portal pelanggan"
              : "Hanya langganan ACTIVE"
          }
        >
          Buat & kirim
        </Button>
        {status === "ACTIVE" ? (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => go(() => pauseSubscriptionAction(id))}>
            Jeda
          </Button>
        ) : null}
        {status === "PAUSED" ? (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => go(() => resumeSubscriptionAction(id))}>
            Lanjut
          </Button>
        ) : null}
        {status !== "CANCELLED" ? (
          <Button size="sm" variant="destructive" disabled={pending} onClick={() => go(() => cancelSubscriptionAction(id))}>
            Batalkan
          </Button>
        ) : null}
      </div>
      <InlineError message={error} />
      {lastInvoice ? (
        <p className="text-xs text-mid-gray" role="status">
          {lastInvoice.skipped ? "Sudah ada: " : "Terkirim: "}
          <Link
            href={`/invoices/${lastInvoice.invoiceId}`}
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            {lastInvoice.invoiceNumber ?? lastInvoice.invoiceId.slice(0, 8)}
          </Link>
          {lastInvoice.status ? ` · ${lastInvoice.status}` : ""}
        </p>
      ) : null}
    </div>
  );
}
