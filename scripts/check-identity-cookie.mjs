/**
 * Proves shipped identity-cookie HMAC + middleware uses getSession not getUser.
 * Runs pure crypto against same algorithm as src/lib/auth/identity-cookie.ts.
 */
import { createHmac, timingSafeEqual } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";

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
function sign(body) {
  return createHmac("sha256", secret).update(body).digest("base64url");
}
function encode(p) {
  const payload = { ...p, exp: Math.floor(Date.now() / 1000) + 600 };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${sign(body)}`;
}
function decode(raw) {
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
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!p?.id || p.exp < Math.floor(Date.now() / 1000)) return null;
    return p;
  } catch {
    return null;
  }
}

const raw = encode({
  id: "u1",
  role: "DEVELOPER",
  status: "ACTIVE",
  full_name: "A",
  email: "a@b.c",
  owner_id: "",
  customer_id: "",
  phone: "",
});
const p = decode(raw);
ok(p && p.id === "u1" && p.role === "DEVELOPER", "roundtrip encode/decode");
ok(decode(raw.slice(0, -3) + "zzz") === null, "tamper rejected");
ok(decode(null) === null, "null rejected");
ok(decode("no-dot") === null, "malformed rejected");

const src = read("src/lib/auth/identity-cookie.ts");
ok(/export function encodeIdentityCookie/.test(src), "encodeIdentityCookie exported");
ok(/export function decodeIdentityCookie/.test(src), "decodeIdentityCookie exported");
ok(/createHmac/.test(src) && /timingSafeEqual/.test(src), "HMAC + timingSafeEqual");
ok(/finv_id/.test(src), "cookie name finv_id");

const mw = read("src/middleware.ts");
ok(/decodeIdentityCookie/.test(mw), "middleware uses identity cookie");
ok(/encodeIdentityCookie/.test(mw), "middleware sets identity cookie");
ok(/IDENTITY_COOKIE/.test(mw), "middleware IDENTITY_COOKIE");

const sbMw = read("src/lib/supabase/middleware.ts");
const sbCode = sbMw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
ok(/getSession/.test(sbCode), "supabase middleware getSession");
ok(!/getUser\s*\(/.test(sbCode), "supabase middleware no getUser() call");

const profile = read("src/lib/auth/profile.ts");
ok(/getSession/.test(profile), "getSessionProfile uses getSession fallback");
ok(/requireVerifiedProfile[\s\S]*getUser/.test(profile), "mutations still getUser");

if (fails) {
  console.error(`\n${fails} failed`);
  process.exit(1);
}
console.log("\nall identity-cookie checks ok");
