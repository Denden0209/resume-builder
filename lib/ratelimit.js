import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "@/lib/redis";

// Central rate limiting. Fail-open ONLY when Redis isn't configured at all
// (local dev) — in production Redis exists, so limits always apply.
const cache = new Map();

function limiter(name, tokens, window) {
  const key = `${name}:${tokens}:${window}`;
  if (!cache.has(key)) {
    cache.set(
      key,
      new Ratelimit({
        redis: getRedis(),
        limiter: Ratelimit.slidingWindow(tokens, window),
        prefix: `rl:${name}`,
      })
    );
  }
  return cache.get(key);
}

export function getClientIp(req) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Check a limit. Returns { success, remaining } — fails open if Redis is absent.
 * @param {string} name   bucket name, e.g. "parse"
 * @param {string} id     ip or user id
 * @param {number} tokens allowed requests
 * @param {string} window e.g. "1 h"
 */
export async function checkLimit(name, id, tokens, window) {
  try {
    const res = await limiter(name, tokens, window).limit(id);
    return res;
  } catch (e) {
    if (String(e.message).includes("Redis is not configured")) {
      return { success: true, remaining: tokens }; // local dev without Redis
    }
    // Redis hiccup: fail closed for safety on the expensive endpoint
    console.error("ratelimit error:", e);
    return { success: false, remaining: 0 };
  }
}
