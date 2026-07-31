/**
 * Edge-safe identity cookie (Web Crypto HMAC-SHA256).
 * Hobby: skip profiles DB on nav for ~10 min after first load.
 */

export const IDENTITY_COOKIE = "finv_id";
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
  return (
    process.env.APP_ENCRYPTION_KEY ||
    process.env.PDF_SIGNING_SECRET ||
    "dev-only-finv-identity-secret-32b"
  );
}

function b64urlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  let b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function utf8(s: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(s) as Uint8Array<ArrayBuffer>;
}

function utf8Decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    utf8(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function sign(body: string): Promise<string> {
  const key = await hmacKey();
  const sig = await crypto.subtle.sign("HMAC", key, utf8(body));
  return b64urlEncode(new Uint8Array(sig));
}

async function verify(body: string, sigB64: string): Promise<boolean> {
  try {
    const key = await hmacKey();
    const sig = b64urlDecode(sigB64);
    return crypto.subtle.verify(
      "HMAC",
      key,
      sig as BufferSource,
      utf8(body),
    );
  } catch {
    return false;
  }
}

export async function encodeIdentityCookie(
  p: Omit<IdentityPayload, "exp">,
): Promise<string> {
  const payload: IdentityPayload = {
    ...p,
    exp: Math.floor(Date.now() / 1000) + TTL_SEC,
  };
  const body = b64urlEncode(utf8(JSON.stringify(payload)));
  const sig = await sign(body);
  return `${body}.${sig}`;
}

export async function decodeIdentityCookie(
  raw: string | undefined | null,
): Promise<IdentityPayload | null> {
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot < 1) return null;
  const body = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!(await verify(body, sig))) return null;
  try {
    const json = utf8Decode(b64urlDecode(body));
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
