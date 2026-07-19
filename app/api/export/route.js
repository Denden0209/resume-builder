import { getRedis } from "@/lib/redis";
import { getUser } from "@/lib/supabase/server";
import { getPlan } from "@/lib/plan";
import { checkLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST { slug, format: "docx" | "pdf" } — owner + Pro only
export async function POST(req) {
  try {
    const user = await getUser();
    if (!user) return Response.json({ error: "Sign in to export." }, { status: 401 });

    const { tier } = await getPlan(user.id);
    if (tier !== "pro") {
      return Response.json({ error: "Resume export (PDF/Word) is a Pro feature — see the Pricing page." }, { status: 402 });
    }

    const rl = await checkLimit("export-user", user.id, 20, "1 h");
    if (!rl.success) return Response.json({ error: "Export limit reached — try again soon." }, { status: 429 });

    const { slug, format } = await req.json();
    if (!slug || !["docx", "pdf"].includes(format)) {
      return Response.json({ error: "Need slug and format (docx|pdf)" }, { status: 400 });
    }

    const redis = getRedis();
    const rec = await redis.get(`page:${slug}`);
    if (!rec?.data) return Response.json({ error: "Page not found" }, { status: 404 });
    if (rec.ownerId !== user.id) {
      return Response.json({ error: "That page belongs to a different account" }, { status: 403 });
    }

    const base = (rec.data.name || "resume").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    if (format === "docx") {
      const { buildDocx } = await import("@/lib/docxgen");
      const buf = await buildDocx(rec.data);
      return new Response(buf, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${base}-resume.docx"`,
        },
      });
    }
    const { buildPdf } = await import("@/lib/pdfgen");
    const buf = await buildPdf(rec.data);
    return new Response(buf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${base}-resume.pdf"`,
      },
    });
  } catch (e) {
    console.error("export error:", e);
    return Response.json({ error: "Export failed — try again." }, { status: 500 });
  }
}
