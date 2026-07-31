import {
  checkRateLimit as memoryCheck,
  LOGIN_LIMIT,
  RESET_LIMIT,
  PUBLIC_VIEW_LIMIT,
  PUBLIC_PAY_LIMIT,
} from "./memory";

export { LOGIN_LIMIT, RESET_LIMIT, PUBLIC_VIEW_LIMIT, PUBLIC_PAY_LIMIT };

type Result = { ok: true } | { ok: false; retryAfterSec: number };

/**
 * Rate limit: Upstash REST if UPSTASH_REDIS_REST_URL + TOKEN set, else memory.
 * Memory is single-instance (Vercel hobby gap); Upstash for multi-instance.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<Result> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    try {
      return await upstashLimit(url, token, key, limit, windowMs);
    } catch {
      // fall through to memory
    }
  }
  return memoryCheck(key, limit, windowMs);
}

async function upstashLimit(
  baseUrl: string,
  token: string,
  key: string,
  limit: number,
  windowMs: number,
): Promise<Result> {
  const redisKey = `rl:${key}`;
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  // INCR + EXPIRE pipeline via REST
  const pipe = await fetch(`${baseUrl.replace(/\/$/, "")}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", redisKey],
      ["EXPIRE", redisKey, windowSec, "NX"],
      ["TTL", redisKey],
    ]),
  });
  if (!pipe.ok) throw new Error(`upstash ${pipe.status}`);
  const rows = (await pipe.json()) as { result: number }[];
  const count = Number(rows[0]?.result ?? 0);
  const ttl = Number(rows[2]?.result ?? windowSec);
  if (count > limit) {
    return { ok: false, retryAfterSec: Math.max(1, ttl > 0 ? ttl : windowSec) };
  }
  return { ok: true };
}
