"use client";

import { useEffect } from "react";

/** POST VIEWED once after paint — never blocks public HTML. */
export function PublicViewBeacon({ token }: { token: string }) {
  useEffect(() => {
    if (!token || token.length < 32) return;
    const key = `finv-viewed:${token}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* private mode */
    }
    const url = `/api/public/invoices/${encodeURIComponent(token)}/view`;
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(url);
      return;
    }
    void fetch(url, { method: "POST", keepalive: true }).catch(() => {});
  }, [token]);
  return null;
}
