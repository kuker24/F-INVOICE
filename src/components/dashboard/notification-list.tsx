"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/server/actions/notifications";
import {
  formatRelativeId,
  notificationHref,
} from "@/lib/notifications/href";
import type { Notification } from "@/types/database";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NotificationList({
  notes,
  portal = false,
}: {
  notes: Notification[];
  portal?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const unread = notes.filter((n) => !n.is_read).length;

  function markAll() {
    setStatus(null);
    start(async () => {
      const res = await markAllNotificationsReadAction();
      if (res && "success" in res && res.success === false) {
        setStatus(res.error?.message ?? "Gagal menandai dibaca");
        return;
      }
      setStatus("Semua ditandai dibaca");
      router.refresh();
    });
  }

  function openNote(id: string, isRead: boolean) {
    if (isRead) return;
    setStatus(null);
    start(async () => {
      const res = await markNotificationReadAction(id);
      if (res && "success" in res && res.success === false) {
        setStatus(res.error?.message ?? "Gagal menandai dibaca");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight text-ink">
          Notifikasi
          {unread > 0 ? (
            <span className="ml-2 text-sm font-medium text-mid-gray">
              {unread} belum dibaca
            </span>
          ) : null}
        </h2>
        {unread > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={markAll}
          >
            Tandai dibaca
          </Button>
        ) : null}
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {status ?? ""}
      </p>
      {status && !status.startsWith("Semua") ? (
        <p className="mb-2 text-sm text-ember" role="alert">
          {status}
        </p>
      ) : null}
      {notes.length ? (
        <ul className="divide-y divide-hairline text-sm">
          {notes.map((n) => {
            const href = notificationHref(n.target_type, n.target_id, {
              portal,
            });
            const body = (
              <>
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="font-medium">{n.title}</span>
                    <span className="text-mid-gray"> — {n.message}</span>
                  </span>
                  <time
                    className="shrink-0 text-xs text-mid-gray tabular-nums"
                    dateTime={n.created_at}
                  >
                    {formatRelativeId(n.created_at)}
                  </time>
                </span>
                {!n.is_read ? (
                  <span className="mt-0.5 block text-xs font-medium text-ink">
                    Belum dibaca
                  </span>
                ) : null}
              </>
            );
            return (
              <li
                key={n.id}
                className={cn(
                  "py-2.5 first:pt-0 last:pb-0",
                  n.is_read ? "text-mid-gray" : "text-ink",
                )}
              >
                {href ? (
                  <Link
                    href={href}
                    onClick={() => openNote(n.id, n.is_read)}
                    className="-mx-1 block rounded-[10px] px-1 hover:bg-canvas/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                  >
                    {body}
                  </Link>
                ) : (
                  <div>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-mid-gray">
          Belum ada notifikasi. Kirim invoice atau verifikasi bayar — ringkasan
          muncul di sini.
        </p>
      )}
    </div>
  );
}
