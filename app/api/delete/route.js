import { getRedis } from "@/lib/redis";
import { getUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { slug } = await req.json();
    if (!slug) return Response.json({ error: "Missing slug" }, { status: 400 });

    const user = await getUser();
    if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });

    const redis = getRedis();
    const rec = await redis.get(`page:${slug}`);
    if (!rec) return Response.json({ ok: true }); // already gone
    if (rec.ownerId !== user.id) {
      return Response.json({ error: "That page belongs to a different account" }, { status: 403 });
    }

    await redis.del(`page:${slug}`);
    try {
      await Promise.all([
        redis.zrem("registry:pages", slug),
        redis.zrem(`user:${user.id}:pages`, slug),
        redis.del(`views:${slug}`),
      ]);
    } catch {}

    return Response.json({ ok: true });
  } catch (e) {
    console.error("delete error:", e);
    return Response.json({ error: "Delete failed" }, { status: 500 });
  }
}
