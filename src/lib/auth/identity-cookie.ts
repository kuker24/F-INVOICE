/** Shared by middleware (edge) + server — no server-only. */
import { createHmac, timingSafeEqual } from "crypto";

/** Edge-readable staff/portal identity cache — skip profiles DB on every nav. */
export const IDENTITY_COOKIE = "finv_id";
/** Hobby speed: 10 min. Role/status change lags until expiry (mutations still re-verify JWT). */
const TTL_SEC = 10 * 60;

export type IdentityPayload = {
  id: string;
  role: string;
  status: string;
  full_name: string;
  email: string;
  owner_id: string;
  customer_id: string;
  phone: string;
  exp: number;
};

function secret(): string {
  // Prefer APP_ENCRYPTION_KEY; fallback PDF secret (always present in prod env).
  return (
    process.env.APP_ENCRYPTION_KEY ||
    process.env.PDF_SIGNING_SECRET ||
    "dev-only-finv-identity-secret-32b"
  );
}

function sign(body: string): string {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

export function encodeIdentityCookie(p: Omit<IdentityPayload, "exp">): string {
  const payload: IdentityPayload = {
    ...p,
    exp: Math.floor(Date.now() / 1000) + TTL_SEC,
  };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${sign(body)}`;
}

export function decodeIdentityCookie(raw: string | undefined | null): IdentityPayload | null {
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot < 1) return null;
  const body = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = sign(body);
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(sig);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const json = Buffer.from(body, "base64url").toString("utf8");
    const p = JSON.parse(json) as IdentityPayload;
    if (!p?.id || !p.role || !p.status || !p.exp) return null;
    if (p.exp < Math.floor(Date.now() / 1000)) return null;
    return p;
  } catch {
    return null;
  }
}

export function identityCookieOptions(maxAgeSec = TTL_SEC) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSec,
  };
}
