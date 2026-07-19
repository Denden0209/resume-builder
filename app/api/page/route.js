import { getRedis } from "@/lib/redis";
import { getUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Owner-only fetch of a page's data for editing
export async function GET(req) {
  try {
    const slug = new URL(req.url).searchParams.get("slug");
    if (!slug) return Response.json({ error: "Missing slug" }, { status: 400 });

    const user = await getUser();
    if (!user) return Response.json({ error: "Sign in to edit your pages" }, { status: 401 });

    const redis = getRedis();
    const rec = await redis.get(`page:${slug}`);
    if (!rec?.data) return Response.json({ error: "Page not found" }, { status: 404 });
    if (rec.ownerId !== user.id) {
      return Response.json({ error: "That page belongs to a different account" }, { status: 403 });
    }
    return Response.json({ data: rec.data, slug });
  } catch (e) {
    console.error("page fetch error:", e);
    return Response.json({ error: "Failed to load page" }, { status: 500 });
  }
}
