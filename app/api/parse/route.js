import Anthropic from "@anthropic-ai/sdk";
import mammoth from "mammoth";
import { SYSTEM_PROMPT, PARSE_MODEL, validateData, extractJson } from "@/lib/prompt";
import { checkLimit, getClientIp } from "@/lib/ratelimit";
import { getUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_BYTES = 4 * 1024 * 1024; // 4MB — Vercel rejects request bodies over ~4.5MB
const MAX_PDF_PAGES = 10; // resumes are 1-3 pages; blocks token-bomb PDFs

// Best-effort PDF page count from raw bytes (0 = undetectable, allow — size cap still applies)
function pdfPageCount(buf) {
  try {
    const head = buf.toString("latin1");
    const matches = head.match(/\/Type\s*\/Page(?![s\w])/g);
    return matches ? matches.length : 0;
  } catch {
    return 0;
  }
}

export async function POST(req) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json(
        { error: "Server missing ANTHROPIC_API_KEY. Add it in Vercel → Settings → Environment Variables." },
        { status: 500 }
      );
    }

    // ---- Rate limit BEFORE any expensive work ----
    // Anonymous: 2 parses per 24h per IP (a taste — accounts get more).
    // Signed-in: 10/hour burst guard + monthly quota by tier below.
    const user = await getUser();
    const rl = user
      ? await checkLimit("parse-user", user.id, 10, "1 h")
      : await checkLimit("parse-ip", getClientIp(req), 2, "24 h");
    if (!rl.success) {
      return Response.json(
        { error: user
            ? "You've hit the hourly parsing limit — try again in a bit."
            : "You've used today's free anonymous parses — sign in with Google for a monthly allowance, or come back tomorrow." },
        { status: 429 }
      );
    }

    // ---- Monthly quota by plan tier (signed-in users) ----
    if (user) {
      const { getPlan, limitsFor, getParseUsage } = await import("@/lib/plan");
      const { tier } = await getPlan(user.id);
      const limit = limitsFor(tier).parsesPerMonth;
      const used = await getParseUsage(user.id);
      if (used >= limit) {
        return Response.json(
          { error: tier === "free"
              ? `You've used your ${limit} free parses this month. Pro includes ${limitsFor("pro").parsesPerMonth}/month — see the Pricing page.`
              : `You've reached your ${limit} parses this month — resets on the 1st.` },
          { status: 402 }
        );
      }
    }

    const form = await req.formData();
    const file = form.get("file");
    const mode = form.get("mode"); // "scratch" = typed-in career story (Pro feature)

    if (mode === "scratch") {
      if (!user) return Response.json({ error: "Sign in to build from scratch." }, { status: 401 });
      const { getPlan } = await import("@/lib/plan");
      const { tier } = await getPlan(user.id);
      if (tier !== "pro") {
        return Response.json(
          { error: "Building without a resume is a Pro feature — see the Pricing page." },
          { status: 402 }
        );
      }
    }

    if (!file || typeof file === "string") {
      return Response.json({ error: "No file uploaded" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return Response.json({ error: "File too large (max 4MB)" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const name = (file.name || "").toLowerCase();

    // ---- Content checks by magic bytes, not just filename ----
    const isPdf = buf.subarray(0, 5).toString() === "%PDF-";
    const isZip = buf[0] === 0x50 && buf[1] === 0x4b; // "PK" — docx container

    // Build the user content: PDFs go to Claude natively; DOCX via mammoth; else plain text
    let userContent;
    if (name.endsWith(".pdf") || file.type === "application/pdf") {
      if (!isPdf) {
        return Response.json({ error: "That file isn't a valid PDF." }, { status: 400 });
      }
      const pages = pdfPageCount(buf);
      if (pages > MAX_PDF_PAGES) {
        return Response.json(
          { error: `That PDF has ${pages} pages — resumes should be under ${MAX_PDF_PAGES}. Upload just your resume.` },
          { status: 400 }
        );
      }
      userContent = [
        {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: buf.toString("base64"),
          },
        },
        { type: "text", text: "Parse this resume into the JSON schema." },
      ];
    } else if (name.endsWith(".docx")) {
      if (!isZip) {
        return Response.json({ error: "That file isn't a valid DOCX." }, { status: 400 });
      }
      const { value } = await mammoth.extractRawText({ buffer: buf });
      if (!value || value.trim().length < 40) {
        return Response.json({ error: "Couldn't read text from that DOCX." }, { status: 400 });
      }
      userContent = `Parse this resume into the JSON schema.\n\n<resume>\n${value.slice(0, 60000)}\n</resume>`;
    } else {
      if (isPdf || isZip) {
        return Response.json({ error: "Unrecognized file — rename it with the correct .pdf or .docx extension." }, { status: 400 });
      }
      const text = buf.toString("utf8");
      if (!text || text.trim().length < 40) {
        return Response.json(
          { error: "Unsupported file. Upload a PDF, DOCX, or TXT resume." },
          { status: 400 }
        );
      }
      userContent = `Parse this resume into the JSON schema.\n\n<resume>\n${text.slice(0, 60000)}\n</resume>`;
    }

    const client = new Anthropic();
    const stream = client.messages.stream({
      model: PARSE_MODEL,
      max_tokens: 6000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });
    const msg = await stream.finalMessage();

    const text = msg.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    const data = extractJson(text);
    const err = validateData(data);
    if (err) return Response.json({ error: err }, { status: 422 });

    // Owner stats (best-effort — never block the user on this)
    try {
      const { getRedis } = await import("@/lib/redis");
      const redis = getRedis();
      const day = new Date().toISOString().slice(0, 10);
      await Promise.all([
        redis.incr("stats:parses"),
        redis.incr(`stats:parses:${day}`),
      ]);
      if (user) {
        const { incrParseUsage } = await import("@/lib/plan");
        await incrParseUsage(user.id);
      }
    } catch {}

    return Response.json({ data });
  } catch (e) {
    console.error("parse error:", e);
    const msg = e?.status === 401
      ? "Invalid ANTHROPIC_API_KEY."
      : "Parsing failed — please try again or use a different file format.";
    return Response.json({ error: msg }, { status: 500 });
  }
}
