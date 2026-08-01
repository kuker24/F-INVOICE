"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { InlineError } from "@/components/ui/inline-error";
import {
  cancelPaymentAction,
  rejectPaymentAction,
  verifyPaymentAction,
} from "@/server/actions/payments";

export function PaymentRowActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function go(fn: () => Promise<{ success: boolean; error?: { message: string } }>) {
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
      <div className="flex flex-wrap gap-1">
        {status === "PENDING" ? (
          <>
            <Button size="sm" disabled={pending} onClick={() => go(() => verifyPaymentAction(id))}>
              Verifikasi
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => {
                const reason = prompt("Alasan tolak") || "Ditolak";
                go(() => rejectPaymentAction(id, reason));
              }}
            >
              Tolak
            </Button>
          </>
        ) : null}
        {status === "VERIFIED" || status === "PENDING" ? (
          <Button
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() => {
              if (confirm("Batalkan pembayaran?")) go(() => cancelPaymentAction(id));
            }}
          >
            Batalkan
          </Button>
        ) : null}
      </div>
      <InlineError message={error} />
    </div>
  );
}
