/**
 * Edge-safe HMAC algorithm parity + structural checks.
 * Mirrors src/lib/auth/identity-cookie.ts using Web Crypto (node global crypto.subtle).
 */
import { webcrypto } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";

const subtle = webcrypto.subtle;
const root = process.cwd();
const read = (p) => readFileSync(join(root, p), "utf8");

let fails = 0;
function ok(cond, msg) {
  if (cond) console.log("ok", msg);
  else {
    console.error("FAIL", msg);
    fails++;
  }
}

const secret = "x".repeat(32);

function b64urlEncode(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return Buffer.from(binary, "binary")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
function b64urlDecode(s) {
  let b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  return new Uint8Array(Buffer.from(b64, "base64"));
}
function utf8(s) {
  return new TextEncoder().encode(s);
}

async function hmacKey() {
  return subtle.importKey(
    "raw",
    utf8(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}
async function sign(body) {
  const key = await hmacKey();
  const sig = await subtle.sign("HMAC", key, utf8(body));
  return b64urlEncode(new Uint8Array(sig));
}
async function verify(body, sigB64) {
  const key = await hmacKey();
  return subtle.verify("HMAC", key, b64urlDecode(sigB64), utf8(body));
}
async function encode(p) {
  const payload = { ...p, exp: Math.floor(Date.now() / 1000) + 600 };
  const body = b64urlEncode(utf8(JSON.stringify(payload)));
  return `${body}.${await sign(body)}`;
}
async function decode(raw) {
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot < 1) return null;
  const body = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!(await verify(body, sig))) return null;
  const p = JSON.parse(Buffer.from(b64urlDecode(body)).toString("utf8"));
  if (!p?.id || p.exp < Math.floor(Date.now() / 1000)) return null;
  return p;
}

const raw = await encode({
  id: "u1",
  role: "DEVELOPER",
  status: "ACTIVE",
  full_name: "A",
  email: "a@b.c",
  owner_id: "",
  customer_id: "",
  phone: "",
});
const p = await decode(raw);
ok(p && p.id === "u1" && p.role === "DEVELOPER", "roundtrip encode/decode");
ok((await decode(raw.slice(0, -3) + "zzz")) === null, "tamper rejected");
ok((await decode(null)) === null, "null rejected");

const src = read("src/lib/auth/identity-cookie.ts");
ok(/crypto\.subtle/.test(src), "uses Web Crypto subtle");
ok(!/from ["']crypto["']/.test(src), "no node crypto import");
ok(!/\bBuffer\b/.test(src), "no Buffer (edge-safe)");
ok(/export async function encodeIdentityCookie/.test(src), "async encode");
ok(/export async function decodeIdentityCookie/.test(src), "async decode");
ok(/finv_id/.test(src), "cookie name finv_id");

const mw = read("src/middleware.ts");
ok(/await decodeIdentityCookie/.test(mw), "middleware awaits decode");
ok(/await encodeIdentityCookie/.test(mw), "middleware awaits encode");

const sbMw = read("src/lib/supabase/middleware.ts");
const sbCode = sbMw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
ok(/getSession/.test(sbCode), "getSession");
ok(!/getUser\s*\(/.test(sbCode), "no getUser() in session middleware");

const profile = read("src/lib/auth/profile.ts");
ok(/getSession/.test(profile), "profile getSession fallback");
ok(/requireVerifiedProfile[\s\S]*getUser/.test(profile), "mutations getUser");

if (fails) {
  console.error(`\n${fails} failed`);
  process.exit(1);
}
console.log("\nall identity-cookie checks ok");
