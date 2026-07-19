import { getRedis } from "@/lib/redis";
import { getUser } from "@/lib/supabase/server";
import { checkLimit, getClientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const rl = await checkLimit("interest-ip", getClientIp(req), 10, "1 h");
    if (!rl.success) return Response.json({ error: "Too many requests" }, { status: 429 });

    const user = await getUser();
    if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });

    const { plan } = await req.json();
    const p = plan === "career" ? "career" : "pro";

    const redis = getRedis();
    await Promise.all([
      redis.incr("stats:interest"),
      redis.zadd("interest:users", {
        score: Date.now(),
        member: `${p}|${user.email || user.id}`,
      }),
    ]);
    return Response.json({ ok: true });
  } catch (e) {
    console.error("interest error:", e);
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
