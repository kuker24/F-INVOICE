"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { InlineError } from "@/components/ui/inline-error";
import {
  cancelSubscriptionAction,
  generateSubscriptionInvoiceAction,
  pauseSubscriptionAction,
  resumeSubscriptionAction,
} from "@/server/actions/subscriptions";

export function SubscriptionRowActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  function go(fn: () => Promise<{ success: boolean; error?: { message: string }; data?: unknown }>) {
    setError(null);
    setOkMsg(null);
    start(async () => {
      const res = await fn();
      if (!res.success) {
        setError(res.error?.message ?? "Gagal");
        return;
      }
      if (res.data && typeof res.data === "object" && "invoiceId" in (res.data as object)) {
        setOkMsg("Invoice: " + (res.data as { invoiceId: string }).invoiceId);
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-1">
        <Button size="sm" variant="outline" disabled={pending} onClick={() => go(() => generateSubscriptionInvoiceAction(id))}>
          Buat invoice
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
      {okMsg ? (
        <p className="text-xs text-mid-gray" role="status">
          {okMsg}
        </p>
      ) : null}
    </div>
  );
}
