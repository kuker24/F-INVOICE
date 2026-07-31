"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  cancelSubscriptionAction,
  generateSubscriptionInvoiceAction,
  pauseSubscriptionAction,
  resumeSubscriptionAction,
} from "@/server/actions/subscriptions";

export function SubscriptionRowActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  function go(fn: () => Promise<{ success: boolean; error?: { message: string }; data?: unknown }>) {
    start(async () => {
      const res = await fn();
      if (!res.success) alert(res.error?.message ?? "Gagal");
      else if (res.data && typeof res.data === "object" && "invoiceId" in (res.data as object)) {
        alert("Invoice: " + (res.data as { invoiceId: string }).invoiceId);
      }
      router.refresh();
    });
  }
  return (
    <div className="flex flex-wrap gap-1">
      <Button size="sm" variant="outline" disabled={pending} onClick={() => go(() => generateSubscriptionInvoiceAction(id))}>
        Generate
      </Button>
      {status === "ACTIVE" ? (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => go(() => pauseSubscriptionAction(id))}>Pause</Button>
      ) : null}
      {status === "PAUSED" ? (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => go(() => resumeSubscriptionAction(id))}>Resume</Button>
      ) : null}
      {status !== "CANCELLED" ? (
        <Button size="sm" variant="destructive" disabled={pending} onClick={() => go(() => cancelSubscriptionAction(id))}>Cancel</Button>
      ) : null}
    </div>
  );
}
