type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

/** In-memory rate limit. OK for single-instance MVP; PR7 may add Upstash. */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (entry.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  entry.count += 1;
  return { ok: true };
}

// Hobby: looser login RL (was 5/15m — e2e + retries false-positive). Mutasi tetap auth.
export const LOGIN_LIMIT = { limit: 40, windowMs: 15 * 60 * 1000 };
export const RESET_LIMIT = { limit: 8, windowMs: 60 * 60 * 1000 };
export const PUBLIC_VIEW_LIMIT = { limit: 120, windowMs: 60 * 1000 };
export const PUBLIC_PAY_LIMIT = { limit: 15, windowMs: 60 * 60 * 1000 };
