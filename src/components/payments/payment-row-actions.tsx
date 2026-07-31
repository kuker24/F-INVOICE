"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  cancelPaymentAction,
  rejectPaymentAction,
  verifyPaymentAction,
} from "@/server/actions/payments";

export function PaymentRowActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  function go(fn: () => Promise<{ success: boolean; error?: { message: string } }>) {
    start(async () => {
      const res = await fn();
      if (!res.success) alert(res.error?.message ?? "Gagal");
      router.refresh();
    });
  }
  return (
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
  );
}
