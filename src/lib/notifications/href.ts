/** Map notification target → staff/portal route. */
export function notificationHref(
  targetType: string | null | undefined,
  targetId: string | null | undefined,
  opts?: { portal?: boolean },
): string | null {
  if (!targetType || !targetId) return null;
  const portal = opts?.portal ?? false;
  switch (targetType) {
    case "invoice":
      return portal ? `/portal/invoices` : `/invoices/${targetId}`;
    case "payment":
      return portal ? `/portal/payments` : `/payments`;
    case "subscription":
      return portal ? `/portal/subscriptions` : `/subscriptions`;
    case "customer":
      return portal ? null : `/customers/${targetId}`;
    default:
      return null;
  }
}

export function formatRelativeId(iso: string, now = Date.now()): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const sec = Math.round((now - t) / 1000);
  if (sec < 60) return "baru saja";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} mnt`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} jam`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day} hr`;
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}
