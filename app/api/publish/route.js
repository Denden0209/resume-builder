import { customAlphabet } from "nanoid";
import { getRedis } from "@/lib/redis";
import { validateData } from "@/lib/prompt";
import { getUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

const nano = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 6);

function slugify(name) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "profile";
}

export async function POST(req) {
  try {
    const redis = getRedis();
    const body = await req.json();
    const { data, slug: existingSlug, editKey } = body || {};
    const user = await getUser(); // null when logged out or Supabase not configured

    const err = validateData(data);
    if (err) return Response.json({ error: err }, { status: 422 });

    // Republish to an existing slug — allowed for the page owner OR a valid editKey
    if (existingSlug) {
      const rec = await redis.get(`page:${existingSlug}`);
      if (!rec) return Response.json({ error: "Page not found" }, { status: 404 });
      const isOwner = user && rec.ownerId && rec.ownerId === user.id;
      const hasKey = editKey && rec.editKey === editKey;
      if (!isOwner && !hasKey) {
        return Response.json({ error: "You don't have permission to update that page" }, { status: 403 });
      }
      await redis.set(`page:${existingSlug}`, {
        ...rec,
        data,
        updatedAt: Date.now(),
        // First authenticated republish of an anonymous page claims it
        ownerId: rec.ownerId || (user ? user.id : undefined),
      });
      if (user && !rec.ownerId) {
        try { await redis.zadd(`user:${user.id}:pages`, { score: Date.now(), member: existingSlug }); } catch {}
      }
      return Response.json({ slug: existingSlug, editKey: rec.editKey });
    }

    // New page
    let slug = slugify(data.name);
    if (await redis.exists(`page:${slug}`)) {
      slug = `${slug}-${nano()}`;
    }
    const newKey = nano() + nano();
    await redis.set(`page:${slug}`, {
      data,
      editKey: newKey,
      createdAt: Date.now(),
      ownerId: user ? user.id : undefined,
    });

    // Owner stats + registries (best-effort)
    try {
      const day = new Date().toISOString().slice(0, 10);
      const ops = [
        redis.incr("stats:publishes"),
        redis.incr(`stats:publishes:${day}`),
        redis.zadd("registry:pages", { score: Date.now(), member: slug }),
      ];
      if (user) ops.push(redis.zadd(`user:${user.id}:pages`, { score: Date.now(), member: slug }));
      await Promise.all(ops);
    } catch {}

    return Response.json({ slug, editKey: newKey });
  } catch (e) {
    console.error("publish error:", e);
    return Response.json(
      { error: e.message?.includes("Redis is not configured") ? e.message : "Publish failed — try again." },
      { status: 500 }
    );
  }
}
