import { customAlphabet } from "nanoid";
import { getRedis } from "@/lib/redis";
import { validateData } from "@/lib/prompt";

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

    const err = validateData(data);
    if (err) return Response.json({ error: err }, { status: 422 });

    // Republish to an existing slug when the caller holds its editKey
    if (existingSlug && editKey) {
      const rec = await redis.get(`page:${existingSlug}`);
      if (rec && rec.editKey === editKey) {
        await redis.set(`page:${existingSlug}`, { data, editKey, updatedAt: Date.now() });
        return Response.json({ slug: existingSlug, editKey });
      }
      return Response.json({ error: "Invalid edit key for that slug" }, { status: 403 });
    }

    // New page: derive slug from name, add suffix on collision
    let slug = slugify(data.name);
    if (await redis.exists(`page:${slug}`)) {
      slug = `${slug}-${nano()}`;
    }
    const newKey = nano() + nano();
    await redis.set(`page:${slug}`, { data, editKey: newKey, createdAt: Date.now() });

    return Response.json({ slug, editKey: newKey });
  } catch (e) {
    console.error("publish error:", e);
    return Response.json(
      { error: e.message?.includes("Redis is not configured") ? e.message : "Publish failed — try again." },
      { status: 500 }
    );
  }
}
