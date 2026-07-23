import { getRedis } from "@/lib/redis";
import { getUser } from "@/lib/supabase/server";
import { getPlan } from "@/lib/plan";
import { checkLimit, getClientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";

function slugify(name) {
  return name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

// Rename (change slug of) an owned page — Pro feature (vanity URLs)
export async function POST(req) {
  try {
    const rl = await checkLimit("rename-ip", getClientIp(req), 15, "1 h");
    if (!rl.success) return Response.json({ error: "Too many requests" }, { status: 429 });

    const user = await getUser();
    if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });

    const { tier } = await getPlan(user.id);
    if (tier !== "pro") {
      return Response.json({ error: "Custom links are a Pro feature — see Pricing." }, { status: 402 });
    }

    const { oldSlug, newSlug } = await req.json();
    const clean = slugify(newSlug || "");
    if (!oldSlug || clean.length < 3) {
      return Response.json({ error: "New link must be at least 3 letters/numbers." }, { status: 400 });
    }

    const redis = getRedis();
    const rec = await redis.get(`page:${oldSlug}`);
    if (!rec?.data) return Response.json({ error: "Page not found" }, { status: 404 });
    if (rec.ownerId !== user.id) {
      return Response.json({ error: "That page belongs to a different account" }, { status: 403 });
    }
    if (clean === oldSlug) return Response.json({ slug: oldSlug }); // no change

    // Reserved words + collision check
    const reserved = new Set(["u", "api", "admin", "dashboard", "pricing", "auth", "login"]);
    if (reserved.has(clean) || await redis.exists(`page:${clean}`)) {
      return Response.json({ error: "That link is taken — try another." }, { status: 409 });
    }

    // Move the record + view counters, update registries
    await redis.set(`page:${clean}`, rec);
    await redis.del(`page:${oldSlug}`);
    try {
      const views = await redis.get(`views:${oldSlug}`);
      if (views != null) { await redis.set(`views:${clean}`, views); await redis.del(`views:${oldSlug}`); }
      const now = Date.now();
      await redis.zrem("registry:pages", oldSlug);
      await redis.zadd("registry:pages", { score: now, member: clean });
      await redis.zrem(`user:${user.id}:pages`, oldSlug);
      await redis.zadd(`user:${user.id}:pages`, { score: now, member: clean });
    } catch {}

    return Response.json({ slug: clean });
  } catch (e) {
    console.error("rename error:", e);
    return Response.json({ error: "Rename failed — try again." }, { status: 500 });
  }
}
