import { Redis } from "@upstash/redis";

// Supports both env conventions:
// - Vercel KV integration:      KV_REST_API_URL / KV_REST_API_TOKEN
// - Upstash Redis integration:  UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
const url =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export function getRedis() {
  if (!url || !token) {
    throw new Error(
      "Redis is not configured. Add the Upstash Redis integration in Vercel (Storage tab) so KV_REST_API_URL / KV_REST_API_TOKEN env vars exist."
    );
  }
  return new Redis({ url, token });
}
