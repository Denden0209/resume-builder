"use client";

import { useState } from "react";

export default function AdminGrant({ adminKey }) {
  const [userId, setUserId] = useState("");
  const [days, setDays] = useState("90");
  const [msg, setMsg] = useState("");

  async function grant(tier) {
    setMsg("…");
    try {
      const res = await fetch("/api/admin/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userId.trim(), tier, days: +days, adminKey }),
      });
      const j = await res.json();
      setMsg(res.ok ? `✓ ${j.message}` : `✕ ${j.error}`);
    } catch {
      setMsg("✕ Request failed");
    }
  }

  const input = {
    background: "rgba(1,20,38,.7)", border: "1px solid var(--line)", borderRadius: 8,
    color: "var(--ink)", padding: "9px 12px", fontFamily: "IBM Plex Mono, monospace", fontSize: 12,
  };

  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 12, background: "rgba(1,42,74,.35)", padding: "18px 20px", marginTop: 34 }}>
      <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--sky)", marginBottom: 12 }}>
        Manual plan grant — founding members / GCash payments
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input style={{ ...input, flex: "1 1 320px" }} placeholder="User Account ID (they see it on their dashboard)"
          value={userId} onChange={(e) => setUserId(e.target.value)} />
        <input style={{ ...input, width: 90 }} type="number" min="1" value={days}
          onChange={(e) => setDays(e.target.value)} title="Days of Pro" />
        <button className="chip" onClick={() => grant("pro")}>Grant Pro</button>
        <button className="chip" onClick={() => grant("free")}
          style={{ borderColor: "rgba(252,165,165,.35)", color: "#FCA5A5" }}>Revoke</button>
      </div>
      {msg && <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11.5, color: msg.startsWith("✓") ? "#6EE7B7" : "#FCA5A5", marginTop: 10 }}>{msg}</p>}
    </div>
  );
}
