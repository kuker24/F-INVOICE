"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { InlineError } from "@/components/ui/inline-error";
import { setUserStatusAction } from "@/server/actions/users";

export function UserStatusButtons({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function set(s: "ACTIVE" | "INACTIVE" | "SUSPENDED") {
    setError(null);
    start(async () => {
      const res = await setUserStatusAction(id, s);
      if (!res.success) {
        setError(res.error.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1">
        {status !== "ACTIVE" ? (
          <Button size="sm" disabled={pending} onClick={() => set("ACTIVE")}>Aktifkan</Button>
        ) : (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => set("INACTIVE")}>Nonaktif</Button>
        )}
      </div>
      <InlineError message={error} />
    </div>
  );
}
