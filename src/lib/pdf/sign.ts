import { createHmac, timingSafeEqual } from "crypto";
import { getServerEnv } from "@/config/env";

export function signPdfPayload(parts: {
  invoiceId: string;
  exp: number;
  token?: string;
}) {
  const secret = getServerEnv().PDF_SIGNING_SECRET;
  const base = `${parts.invoiceId}.${parts.exp}.${parts.token ?? ""}`;
  const sig = createHmac("sha256", secret).update(base).digest("base64url");
  return sig;
}

export function verifyPdfSig(parts: {
  invoiceId: string;
  exp: number;
  token?: string;
  sig: string;
}) {
  if (Date.now() / 1000 > parts.exp) return false;
  const expected = signPdfPayload(parts);
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(parts.sig);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Staff/session links only — public pages use token-only PDF URL (ISR-safe). */
export function makePdfUrl(appUrl: string, invoiceId: string, token?: string) {
  const exp = Math.floor(Date.now() / 1000) + 300; // 5 min
  const sig = signPdfPayload({ invoiceId, exp, token });
  const u = new URL(`/api/invoices/${invoiceId}/pdf`, appUrl);
  u.searchParams.set("exp", String(exp));
  u.searchParams.set("sig", sig);
  if (token) u.searchParams.set("token", token);
  return u.toString();
}
