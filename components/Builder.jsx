"use client";

import { useRef, useState } from "react";
import Portfolio from "./Portfolio";

export default function Builder() {
  const [phase, setPhase] = useState("idle"); // idle | parsing | review | publishing | done
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [jsonText, setJsonText] = useState("");
  const [jsonErr, setJsonErr] = useState("");
  const [result, setResult] = useState(null); // {slug, editKey, url}
  const [over, setOver] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);

  async function handleFile(file) {
    if (!file) return;
    setError("");
    setPhase("parsing");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/parse", { method: "POST", body: fd });
      const json = await res.json();
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

  async function publish() {
    setPhase("publishing");
    setError("");
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
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
            <div className="status"><span className="spinner"></span>Parsing document → detecting KPIs → ranking projects → building your page…</div>
          )}
          {error && <div className="status"><span className="err">✕ {error}</span></div>}
        </>
      )}

      {(phase === "review" || phase === "publishing") && data && (
        <div className="review">
          <div className="review-head">
            <h2>Review your page</h2>
            <div className="publish-row">
              <button className="btn btn-ghost" onClick={() => { setPhase("idle"); setData(null); }}>← Start over</button>
              <button className="btn btn-primary" onClick={publish} disabled={phase === "publishing"}>
                {phase === "publishing" ? "Publishing…" : "Publish my site →"}
              </button>
            </div>
          </div>

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
          <h2 style={{ textTransform: "uppercase" }}>Your site is live</h2>
          <a className="url" href={result.url} target="_blank" rel="noopener noreferrer">{result.url}</a>
          <div className="publish-row" style={{ justifyContent: "center" }}>
            <button className="btn btn-primary" onClick={copyUrl}>{copied ? "Copied ✓" : "Copy link"}</button>
            <a className="btn btn-ghost" href={result.url} target="_blank" rel="noopener noreferrer">Open site ↗</a>
            <button className="btn btn-ghost" onClick={() => { setPhase("idle"); setData(null); setResult(null); }}>Build another</button>
          </div>
          <p className="hint" style={{ marginTop: 14 }}>
            Save this edit key to update your page later: <b style={{ color: "var(--bright)" }}>{result.editKey}</b>
          </p>
        </div>
      )}
    </div>
  );
}
