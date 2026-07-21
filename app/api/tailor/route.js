import Anthropic from "@anthropic-ai/sdk";
import { PARSE_MODEL, validateData, extractJson } from "@/lib/prompt";
import { getUser } from "@/lib/supabase/server";
import { getPlan } from "@/lib/plan";
import { checkLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 300;

const TAILOR_PROMPT = `You are an expert resume strategist and ATS (applicant tracking system) optimization specialist. You receive:
1. A candidate's portfolio JSON data
2. A target job description

Rewrite the candidate's data to maximize alignment with the job — optimized to pass ATS keyword screening and impress the hiring manager for THIS specific role.

Rewrite these fields:
- headline.lead and headline.accent — reframe toward the target role's language
- eyebrow — align the 3 domain words to the role
- lede — a targeted summary that mirrors the job's priorities and seniority
- every topProjects[].description and [].bullets — surface the achievements most relevant to this job; weave in the job's key terms/skills where the candidate genuinely has them
- every experience[].bullets — reorder and reword so the most role-relevant wins lead; naturally incorporate keywords from the job description that match the candidate's real experience
- skills groups — prioritize skills the job asks for that the candidate has; you may regroup, but only include skills already present in their data
- contactCta — tailored to the role

ABSOLUTE RULES:
1. NEVER invent experience, skills, tools, certifications, metrics, or achievements the candidate does not already have. ATS optimization means surfacing and rephrasing REAL qualifications with the job's vocabulary — not fabricating. If the job wants a skill they lack, do not add it.
2. Keep name, initials, contact info, dates, org names, credentials, and kpis values factually unchanged.
3. Mirror the job's terminology only where it truthfully matches the candidate (e.g., if they did "dashboards" and the job says "reporting solutions," you may say "reporting solutions/dashboards").
4. Keep labels.categories ids as "cat1"/"cat2" and every projectIndex category valid.
5. Return ONLY the complete updated JSON object — same schema, no commentary, no fences.

Also add ONE field: "tailoredFor" — a 3-6 word label of the target role (e.g. "Senior Data Analyst · FinTech").`;

export async function POST(req) {
  try {
    const user = await getUser();
    if (!user) return Response.json({ error: "Sign in to tailor your resume." }, { status: 401 });

    const { tier } = await getPlan(user.id);
    if (tier !== "pro") {
      return Response.json(
        { error: "Job-Targeted Tailoring is a Pro feature — see the Pricing page." },
        { status: 402 }
      );
    }

    const rl = await checkLimit("tailor-user", user.id, 8, "1 h");
    if (!rl.success) return Response.json({ error: "Tailoring limit reached — try again soon." }, { status: 429 });

    const { data, jobDescription } = await req.json();
    const err0 = validateData(data);
    if (err0) return Response.json({ error: err0 }, { status: 422 });
    if (!jobDescription || jobDescription.trim().length < 80) {
      return Response.json({ error: "Paste the full job description (at least a short paragraph)." }, { status: 400 });
    }

    const client = new Anthropic();
    const stream = client.messages.stream({
      model: PARSE_MODEL,
      max_tokens: 7000,
      system: TAILOR_PROMPT,
      messages: [{
        role: "user",
        content: `CANDIDATE DATA:\n${JSON.stringify(data)}\n\nTARGET JOB DESCRIPTION:\n${jobDescription.slice(0, 12000)}`,
      }],
    });
    const msg = await stream.finalMessage();
    const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
    const out = extractJson(text);
    const err = validateData(out);
    if (err) return Response.json({ error: "Tailoring failed — try again." }, { status: 500 });

    return Response.json({ data: out });
  } catch (e) {
    console.error("tailor error:", e);
    return Response.json({ error: "Tailoring failed — try again." }, { status: 500 });
  }
}
