// Server-side plan + usage helpers (Redis-backed).
import { getRedis } from "@/lib/redis";
import { TIER_LIMITS } from "@/lib/plans";

export async function getPlan(userId) {
  try {
    const redis = getRedis();
    const rec = await redis.get(`plan:${userId}`);
    if (!rec) return { tier: "free" };
    if (rec.expiresAt && rec.expiresAt < Date.now()) return { tier: "free", expired: true };
    return { tier: rec.tier || "free", expiresAt: rec.expiresAt || null };
  } catch {
    return { tier: "free" };
  }
}

export function limitsFor(tier) {
  return TIER_LIMITS[tier] || TIER_LIMITS.free;
}

function monthKey() {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

export async function getParseUsage(userId) {
  try {
    const redis = getRedis();
    return +((await redis.get(`usage:${userId}:parses:${monthKey()}`)) || 0);
  } catch {
    return 0;
  }
}

export async function incrParseUsage(userId) {
  try {
    const redis = getRedis();
    const key = `usage:${userId}:parses:${monthKey()}`;
    await redis.incr(key);
    await redis.expire(key, 60 * 60 * 24 * 40); // auto-clean after ~40 days
  } catch {}
}

export async function getPageCount(userId) {
  try {
    const redis = getRedis();
    return +((await redis.zcard(`user:${userId}:pages`)) || 0);
  } catch {
    return 0;
  }
}
