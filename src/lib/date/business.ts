/** Business-day helpers. Default TZ Asia/Jakarta. */

export function todayInTz(timeZone = "Asia/Jakarta", date = new Date()): string {
  // en-CA → YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function yearInTz(timeZone = "Asia/Jakarta", date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
    }).format(date),
  );
}

/** Advance YYYY-MM-DD by calendar months (clamps day). */
export function addMonths(ymd: string, months: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + months, d));
  // clamp if month rolled
  if (dt.getUTCDate() !== d) {
    // last day of previous month
    const last = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), 0));
    return last.toISOString().slice(0, 10);
  }
  return dt.toISOString().slice(0, 10);
}

export function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function advanceBillingDate(
  ymd: string,
  cycle: "MONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "YEARLY" | "CUSTOM",
  customDays?: number | null,
): string {
  switch (cycle) {
    case "MONTHLY":
      return addMonths(ymd, 1);
    case "QUARTERLY":
      return addMonths(ymd, 3);
    case "SEMIANNUAL":
      return addMonths(ymd, 6);
    case "YEARLY":
      return addMonths(ymd, 12);
    case "CUSTOM":
      if (!customDays || customDays <= 0) throw new Error("CUSTOM_INTERVAL_REQUIRED");
      return addDays(ymd, customDays);
  }
}
