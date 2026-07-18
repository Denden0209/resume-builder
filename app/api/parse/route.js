import Anthropic from "@anthropic-ai/sdk";
import mammoth from "mammoth";
import { SYSTEM_PROMPT, PARSE_MODEL, validateData, extractJson } from "@/lib/prompt";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024; // 8MB

export async function POST(req) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json(
        { error: "Server missing ANTHROPIC_API_KEY. Add it in Vercel → Settings → Environment Variables." },
        { status: 500 }
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return Response.json({ error: "No file uploaded" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return Response.json({ error: "File too large (max 8MB)" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const name = (file.name || "").toLowerCase();

    // Build the user content: PDFs go to Claude natively; DOCX via mammoth; else plain text
    let userContent;
    if (name.endsWith(".pdf") || file.type === "application/pdf") {
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
      const { value } = await mammoth.extractRawText({ buffer: buf });
      if (!value || value.trim().length < 40) {
        return Response.json({ error: "Couldn't read text from that DOCX." }, { status: 400 });
      }
      userContent = `Parse this resume into the JSON schema.\n\n<resume>\n${value.slice(0, 60000)}\n</resume>`;
    } else {
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
    const msg = await client.messages.create({
      model: PARSE_MODEL,
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });

    const text = msg.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    const data = extractJson(text);
    const err = validateData(data);
    if (err) return Response.json({ error: err }, { status: 422 });

    return Response.json({ data });
  } catch (e) {
    console.error("parse error:", e);
    const msg = e?.status === 401
      ? "Invalid ANTHROPIC_API_KEY."
      : "Parsing failed — please try again or use a different file format.";
    return Response.json({ error: msg }, { status: 500 });
  }
}
