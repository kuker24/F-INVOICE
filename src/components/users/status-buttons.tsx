"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setUserStatusAction } from "@/server/actions/users";

export function UserStatusButtons({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  function set(s: "ACTIVE" | "INACTIVE" | "SUSPENDED") {
    start(async () => {
      const res = await setUserStatusAction(id, s);
      if (!res.success) alert(res.error.message);
      router.refresh();
    });
  }
  return (
    <div className="flex gap-1">
      {status !== "ACTIVE" ? (
        <Button size="sm" disabled={pending} onClick={() => set("ACTIVE")}>Aktifkan</Button>
      ) : (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => set("INACTIVE")}>Nonaktif</Button>
      )}
    </div>
  );
}
