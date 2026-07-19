"use client";

import { useState } from "react";
import QrCode from "./QrCode";

export default function MyPages({ pages: initial }) {
  const [pages, setPages] = useState(initial);
  const [qrFor, setQrFor] = useState(null); // slug
  const [copied, setCopied] = useState(null);
  const [busy, setBusy] = useState(null);

  const urlFor = (slug) =>
    (typeof window !== "undefined" ? window.location.origin : "") + "/u/" + slug;

  async function remove(slug) {
    if (!confirm("Delete this page permanently? The link will stop working.")) return;
    setBusy(slug);
    try {
      const res = await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      setPages((p) => p.filter((x) => x.slug !== slug));
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  }

  function copy(slug) {
    navigator.clipboard.writeText(urlFor(slug)).then(() => {
      setCopied(slug);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  if (!pages.length) {
    return (
      <div className="status" style={{ textAlign: "center", padding: "34px 20px" }}>
        No pages yet — <a href="/">build your first one</a>. Pages you publish while
        signed in will appear here automatically.
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(330px,1fr))", gap: 14 }}>
        {pages.map((p) => (
          <div key={p.slug} className="index-item" style={{ gap: 10, padding: "18px 20px" }}>
            <div>
              <h4 style={{ fontSize: 17 }}>{p.name}</h4>
              <a href={`/u/${p.slug}`} target="_blank" rel="noopener noreferrer"
                style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11.5 }}>
                /u/{p.slug} ↗
              </a>
            </div>

            <div style={{ display: "flex", gap: 16, borderTop: "1px dashed var(--line)", paddingTop: 10 }}>
              <div>
                <b style={{ fontFamily: "Rajdhani, sans-serif", fontSize: 24, color: "var(--bright)", textShadow: "0 0 14px rgba(169,214,229,.5)" }}>{p.views}</b>
                <span style={{ display: "block", fontFamily: "IBM Plex Mono, monospace", fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted)" }}>Total views</span>
              </div>
              <div>
                <b style={{ fontFamily: "Rajdhani, sans-serif", fontSize: 24, color: "var(--sky)" }}>{p.views7}</b>
                <span style={{ display: "block", fontFamily: "IBM Plex Mono, monospace", fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted)" }}>Last 7 days</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 2 }}>
              <button className="chip" onClick={() => copy(p.slug)}>{copied === p.slug ? "Copied ✓" : "Copy link"}</button>
              <button className="chip" onClick={() => setQrFor(qrFor === p.slug ? null : p.slug)}>QR code</button>
              <a className="chip" href={`/?edit=${p.slug}`} style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Edit</a>
              <button className="chip" onClick={() => remove(p.slug)} disabled={busy === p.slug}
                style={{ borderColor: "rgba(252,165,165,.35)", color: "#FCA5A5" }}>
                {busy === p.slug ? "…" : "Delete"}
              </button>
            </div>

            {qrFor === p.slug && (
              <div style={{ textAlign: "center", paddingTop: 12, borderTop: "1px dashed var(--line)" }}>
                <QrCode url={urlFor(p.slug)} size={190} />
                <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 9.5, color: "var(--muted)", marginTop: 8, letterSpacing: ".06em" }}>
                  Scan with any phone camera → opens this page
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
