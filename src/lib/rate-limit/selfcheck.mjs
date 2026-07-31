/** Runnable check: node src/lib/rate-limit/selfcheck.mjs */

function checkRateLimit(key, limit, windowMs, store = new Map()) {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (entry.count >= limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) };
  }
  entry.count += 1;
  return { ok: true };
}

const store = new Map();
const key = "login:1:a@b.com";
for (let i = 0; i < 5; i++) {
  const r = checkRateLimit(key, 5, 60_000, store);
  if (!r.ok) {
    console.error("FAIL: blocked too early at", i + 1);
    process.exit(1);
  }
}
const sixth = checkRateLimit(key, 5, 60_000, store);
if (sixth.ok) {
  console.error("FAIL: 6th attempt should block");
  process.exit(1);
}
console.log("rate-limit selfcheck OK");
