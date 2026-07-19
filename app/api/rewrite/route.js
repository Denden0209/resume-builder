import Anthropic from "@anthropic-ai/sdk";
import { PARSE_MODEL, validateData, extractJson } from "@/lib/prompt";
import { getUser } from "@/lib/supabase/server";
import { getPlan } from "@/lib/plan";
import { checkLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 300;

const REWRITE_PROMPT = `You are an elite resume writer. You receive the JSON data of a portfolio page. Rewrite ONLY the following fields to be more compelling, metric-forward, and achievement-oriented:
- lede
- every topProjects[].description and topProjects[].bullets
- every experience[].bullets
- contactCta

Rules:
1. Transform task-language into impact-language ("Responsible for reports" -> "Delivered reporting that cut review time 40%") — but NEVER invent numbers, facts, or achievements not already present. If no metric exists, strengthen the verb and specificity instead.
2. Start bullets with strong verbs. Cut filler. Keep each bullet under 30 words.
3. Keep ALL other fields byte-identical (name, kpis, labels, tags, dates, orgs, skills, etc.).
4. Return ONLY the complete updated JSON object. No commentary, no fences.`;

export async function POST(req) {
  try {
    const user = await getUser();
    if (!user) return Response.json({ error: "Sign in to use the AI rewriter." }, { status: 401 });

    const { tier } = await getPlan(user.id);
    if (tier !== "pro") {
      return Response.json(
        { error: "The AI Bullet Rewriter is a Pro feature — see the Pricing page." },
        { status: 402 }
      );
    }

    const rl = await checkLimit("rewrite-user", user.id, 6, "1 h");
    if (!rl.success) return Response.json({ error: "Rewriter limit reached — try again in a bit." }, { status: 429 });

    const { data } = await req.json();
    const err0 = validateData(data);
    if (err0) return Response.json({ error: err0 }, { status: 422 });

    const client = new Anthropic();
    const stream = client.messages.stream({
      model: PARSE_MODEL,
      max_tokens: 6000,
      system: REWRITE_PROMPT,
      messages: [{ role: "user", content: JSON.stringify(data) }],
    });
    const msg = await stream.finalMessage();
    const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
    const out = extractJson(text);
    const err = validateData(out);
    if (err) return Response.json({ error: "Rewrite failed — try again." }, { status: 500 });

    return Response.json({ data: out });
  } catch (e) {
    console.error("rewrite error:", e);
    return Response.json({ error: "Rewrite failed — try again." }, { status: 500 });
  }
}
