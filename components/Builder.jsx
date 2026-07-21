"use client";

import { useEffect, useRef, useState } from "react";
import Portfolio from "./Portfolio";
import QrCode from "./QrCode";

export default function Builder() {
  const [phase, setPhase] = useState("idle"); // idle | parsing | loading | review | publishing | done
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [jsonText, setJsonText] = useState("");
  const [jsonErr, setJsonErr] = useState("");
  const [result, setResult] = useState(null); // {slug, editKey, url}
  const [editSlug, setEditSlug] = useState(null); // set when editing an existing page
  const [over, setOver] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scratch, setScratch] = useState(false);
  const [scratchText, setScratchText] = useState("");
  const [rewriting, setRewriting] = useState(false);
  const [showJob, setShowJob] = useState(false);
  const [jobText, setJobText] = useState("");
  const [tailoring, setTailoring] = useState(false);
  const [tailoredFor, setTailoredFor] = useState("");
  const inputRef = useRef(null);

  // Edit mode: /?edit=slug loads an owned page straight into review
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get("edit");
    if (!slug) return;
    setPhase("loading");
    fetch(`/api/page?slug=${encodeURIComponent(slug)}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Couldn't load page");
        setData(j.data);
        setJsonText(JSON.stringify(j.data, null, 2));
        setEditSlug(slug);
        setPhase("review");
      })
      .catch((e) => {
        setError(e.message);
        setPhase("idle");
      });
  }, []);

  async function handleFile(file, mode) {
    if (!file) return;
    setError("");
    setPhase("parsing");
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (mode) fd.append("mode", mode);
      const res = await fetch("/api/parse", { method: "POST", body: fd });
      const raw = await res.text();
      let json;
      try {
        json = JSON.parse(raw);
      } catch {
        // Non-JSON response = the platform intercepted the request (timeout, size limit, crash)
        if (res.status === 504 || /timeout|timed out/i.test(raw)) {
          throw new Error("The AI took too long and the server timed out. In Vercel: Settings → Functions → enable Fluid Compute, then redeploy. You can also set env var PARSE_MODEL=claude-haiku-4-5 for faster parsing.");
        }
        if (res.status === 413 || /too large/i.test(raw)) {
          throw new Error("File too large for the server (max ~4MB). Try exporting a smaller PDF.");
        }
        throw new Error(`Server error (${res.status}). Check the Vercel function logs for /api/parse.`);
      }
      if (!res.ok) throw new Error(json.error || "Parsing failed");
      setData(json.data);
      setJsonText(JSON.stringify(json.data, null, 2));
      setPhase("review");
    } catch (e) {
      setError(e.message);
      setPhase("idle");
    }
  }

  function updateField(path, value) {
    setData((prev) => {
      const next = structuredClone(prev);
      const keys = path.split(".");
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value;
      setJsonText(JSON.stringify(next, null, 2));
      return next;
    });
  }

  function applyJson() {
    try {
      const parsed = JSON.parse(jsonText);
      setData(parsed);
      setJsonErr("");
    } catch {
      setJsonErr("Invalid JSON — fix the syntax and click Apply again.");
    }
  }

  function submitScratch() {
    if (scratchText.trim().length < 120) {
      setError("Tell us a bit more — at least a few sentences about your roles and wins.");
      return;
    }
    const blob = new File([scratchText], "career-story.txt", { type: "text/plain" });
    handleFile(blob, "scratch");
  }

  async function rewrite() {
    setRewriting(true);
    setError("");
    try {
      const res = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Rewrite failed");
      setData(json.data);
      setJsonText(JSON.stringify(json.data, null, 2));
    } catch (e) {
      setError(e.message);
    } finally {
      setRewriting(false);
    }
  }

  async function tailor() {
    if (jobText.trim().length < 80) {
      setError("Paste the full job description first.");
      return;
    }
    setTailoring(true);
    setError("");
    try {
      const res = await fetch("/api/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, jobDescription: jobText }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Tailoring failed");
      setData(json.data);
      setJsonText(JSON.stringify(json.data, null, 2));
      setTailoredFor(json.data.tailoredFor || "your target role");
      setShowJob(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setTailoring(false);
    }
  }

  async function publish() {
    setPhase("publishing");
    setError("");
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editSlug ? { data, slug: editSlug } : { data }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Publish failed");
      const url = `${window.location.origin}/u/${json.slug}`;
      setResult({ ...json, url });
      setPhase("done");
    } catch (e) {
      setError(e.message);
      setPhase("review");
    }
  }

  function copyUrl() {
    navigator.clipboard.writeText(result.url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }

  return (
    <div className="builder" id="builder">
      {phase === "loading" && (
        <div className="status"><span className="spinner"></span>Loading your page…</div>
      )}

      {(phase === "idle" || phase === "parsing") && (
        <>
          <div
            className={"drop hud" + (over ? " over" : "")}
            onClick={() => phase === "idle" && inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault(); setOver(false);
              if (phase === "idle") handleFile(e.dataTransfer.files?.[0]);
            }}
            role="button" tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && phase === "idle" && inputRef.current?.click()}
          >
            <input ref={inputRef} type="file" accept=".pdf,.docx,.txt,.md"
              onChange={(e) => handleFile(e.target.files?.[0])} />
            <span className="big">{phase === "parsing" ? "Analyzing your resume…" : "Drop your resume here"}</span>
            <span className="sub">
              {phase === "parsing" ? "AI is extracting your best metrics" : "PDF · DOCX · TXT — or click to browse"}
            </span>
          </div>
          {phase === "parsing" && (
            <div className="status"><span className="spinner"></span>Parsing → detecting KPIs → ranking highlights → building your page…</div>
          )}
          {phase === "idle" && !scratch && (
            <p style={{ textAlign: "center", marginTop: 14 }}>
              <button className="chip" onClick={() => { setScratch(true); setError(""); }}>
                ✨ No resume yet? Build from scratch (Pro)
              </button>
            </p>
          )}
          {phase === "idle" && scratch && (
            <div className="review" style={{ marginTop: 18 }}>
              <div className="field wide">
                <label>Tell us your career story — the AI turns it into a full portfolio</label>
                <textarea
                  style={{ minHeight: 200 }}
                  value={scratchText}
                  onChange={(e) => setScratchText(e.target.value)}
                  placeholder={"Write naturally, like you're telling a friend:\n\n• Your name, where you're based, how to reach you\n• Each job: company, title, roughly when, and what you accomplished (numbers help — team size, money saved, people served)\n• Certifications, education, skills\n• What kind of role you're looking for"}
                />
              </div>
              <div className="publish-row">
                <button className="btn btn-primary" onClick={submitScratch}>Generate my portfolio →</button>
                <button className="btn btn-ghost" onClick={() => setScratch(false)}>← Back to upload</button>
              </div>
            </div>
          )}
          {error && <div className="status"><span className="err">✕ {error}</span> {/(Pro|Pricing)/.test(error) && <a href="/pricing">See Pricing →</a>}</div>}
        </>
      )}

      {(phase === "review" || phase === "publishing") && data && (
        <div className="review">
          <div className="review-head">
            <h2>Review your page</h2>
            <div className="publish-row">
              <button className="btn btn-ghost" onClick={() => { setPhase("idle"); setData(null); }}>← Start over</button>
              <button className="btn btn-ghost" onClick={rewrite} disabled={rewriting}
                title="Pro: AI rewrites your bullets into impact statements">
                {rewriting ? "Rewriting…" : "✨ AI Bullet Rewriter"}
              </button>
              <button className="btn btn-ghost" onClick={() => { setShowJob(!showJob); setError(""); }}
                title="Pro: tailor this resume to a specific job posting">
                🎯 Tailor to a Job
              </button>
              <button className="btn btn-primary" onClick={publish} disabled={phase === "publishing"}>
                {phase === "publishing" ? "Publishing…" : "Publish my site →"}
              </button>
            </div>
          </div>

          {tailoredFor && (
            <div className="status" style={{ borderColor: "rgba(110,231,183,.4)" }}>
              <span className="ok">✓ Tailored for: {tailoredFor}</span> — review the highlighted alignment below, then publish or export.
            </div>
          )}
          {showJob && (
            <div className="review" style={{ marginTop: 4, marginBottom: 18 }}>
              <div className="field wide">
                <label>Paste the full job description — AI aligns your resume to its keywords (ATS-ready)</label>
                <textarea
                  style={{ minHeight: 170 }}
                  value={jobText}
                  onChange={(e) => setJobText(e.target.value)}
                  placeholder="Paste the entire job posting here — responsibilities, requirements, and preferred qualifications. The more complete, the better the keyword alignment."
                />
              </div>
              <div className="publish-row">
                <button className="btn btn-primary" onClick={tailor} disabled={tailoring}>
                  {tailoring ? "Tailoring to the role…" : "Generate tailored version →"}
                </button>
                <button className="btn btn-ghost" onClick={() => setShowJob(false)}>Cancel</button>
              </div>
              <p className="hint" style={{ marginTop: 8 }}>
                Your real experience only — the AI surfaces and rephrases what you have to match the job, never invents qualifications.
              </p>
            </div>
          )}
          <div className="fields">
            <div className="field"><label>Name</label>
              <input value={data.name || ""} onChange={(e) => updateField("name", e.target.value)} /></div>
            <div className="field"><label>Location</label>
              <input value={data.location || ""} onChange={(e) => updateField("location", e.target.value)} /></div>
            <div className="field"><label>Headline — lead</label>
              <input value={data.headline?.lead || ""} onChange={(e) => updateField("headline.lead", e.target.value)} /></div>
            <div className="field"><label>Headline — accent (glowing part)</label>
              <input value={data.headline?.accent || ""} onChange={(e) => updateField("headline.accent", e.target.value)} /></div>
            <div className="field wide"><label>Intro paragraph</label>
              <textarea value={data.lede || ""} onChange={(e) => updateField("lede", e.target.value)} /></div>
            <div className="field"><label>Email</label>
              <input value={data.email || ""} onChange={(e) => updateField("email", e.target.value)} /></div>
            <div className="field"><label>Phone</label>
              <input value={data.phone || ""} onChange={(e) => updateField("phone", e.target.value)} /></div>
            <div className="field wide"><label>LinkedIn URL</label>
              <input value={data.linkedin || ""} onChange={(e) => updateField("linkedin", e.target.value)} /></div>
          </div>

          <details className="adv">
            <summary>Advanced: edit everything (projects, KPIs, experience) as JSON</summary>
            <textarea className="jsonbox" value={jsonText} onChange={(e) => setJsonText(e.target.value)} spellCheck={false} />
            <div className="publish-row">
              <button className="btn btn-ghost" onClick={applyJson}>Apply JSON changes</button>
              {jsonErr && <span className="status" style={{ marginTop: 0 }}><span className="err">{jsonErr}</span></span>}
            </div>
          </details>

          {error && <div className="status"><span className="err">✕ {error}</span></div>}

          <div className="preview-frame">
            <div className="preview-bar"><i></i><i></i><i></i> Live preview — scroll inside</div>
            <div className="preview-scale">
              <Portfolio data={data} compact />
            </div>
          </div>
        </div>
      )}

      {phase === "done" && result && (
        <div className="done hud">
          <span className="eyebrow" style={{ justifyContent: "center" }}><span className="blink"></span>Deployed</span>
          <h2 style={{ textTransform: "uppercase" }}>{editSlug ? "Your site is updated" : "Your site is live"}</h2>
          <a className="url" href={result.url} target="_blank" rel="noopener noreferrer">{result.url}</a>
          <div className="publish-row" style={{ justifyContent: "center" }}>
            <button className="btn btn-primary" onClick={copyUrl}>{copied ? "Copied ✓" : "Copy link"}</button>
            <a className="btn btn-ghost" href={result.url} target="_blank" rel="noopener noreferrer">Open site ↗</a>
            <button className="btn btn-ghost" onClick={() => { setPhase("idle"); setData(null); setResult(null); setEditSlug(null); window.history.replaceState({}, "", "/"); }}>Build another</button>
          </div>
          <div style={{ marginTop: 20 }}>
            <QrCode url={result.url} size={190} />
            <p className="hint" style={{ marginTop: 8 }}>
              Scan with any phone camera → opens your portfolio. Screenshot it for your resume or business card.
            </p>
          </div>
          <p className="hint" style={{ marginTop: 14 }}>
            Save this edit key to update your page later: <b style={{ color: "var(--bright)" }}>{result.editKey}</b>
            <br />Or sign in with Google before publishing next time — your pages get saved to a dashboard automatically.
          </p>
        </div>
      )}
    </div>
  );
}
