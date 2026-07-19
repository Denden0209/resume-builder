import { getRedis } from "@/lib/redis";
import { getUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Manual plan grants — for founding members paying via GCash/direct transfer.
export async function POST(req) {
  try {
    const { userId, tier, days, adminKey } = await req.json();

    // Auth: ADMIN_KEY in body, or signed in as OWNER_EMAIL
    let authorized = !!(process.env.ADMIN_KEY && adminKey === process.env.ADMIN_KEY);
    if (!authorized && process.env.OWNER_EMAIL) {
      const user = await getUser();
      authorized = !!(user?.email && user.email.toLowerCase() === process.env.OWNER_EMAIL.toLowerCase());
    }
    if (!authorized) return Response.json({ error: "Unauthorized" }, { status: 403 });

    if (!userId || !["pro", "free"].includes(tier)) {
      return Response.json({ error: "Need userId and tier (pro|free)" }, { status: 400 });
    }

    const redis = getRedis();
    if (tier === "free") {
      await redis.del(`plan:${userId}`);
      return Response.json({ ok: true, message: "Downgraded to free" });
    }
    const d = Math.min(Math.max(+(days || 90), 1), 3650);
    const expiresAt = Date.now() + d * 86400000;
    await redis.set(`plan:${userId}`, { tier: "pro", expiresAt, grantedBy: "manual", grantedAt: Date.now() });
    return Response.json({ ok: true, message: `Pro granted for ${d} days`, expiresAt });
  } catch (e) {
    console.error("grant error:", e);
    return Response.json({ error: "Grant failed" }, { status: 500 });
  }
}
