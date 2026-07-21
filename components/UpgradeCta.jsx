"use client";

import { useState } from "react";
import { createClient, supabaseConfigured } from "@/lib/supabase/client";

export default function UpgradeCta({ plan, label, live = false, product = "monthly", ghost = false }) {
  const [state, setState] = useState("idle"); // idle | busy | done | error
  const [errMsg, setErrMsg] = useState("");

  async function click() {
    if (state === "done") return;
    // Require sign-in so interest maps to a real account
    if (supabaseConfigured()) {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: `${window.location.origin}/auth/callback?next=/pricing` },
        });
        return;
      }
    }
    setState("busy");
    try {
      if (live && plan === "pro") {
        // Real checkout: monthly by default; pass product offered via second click path
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || !j.url) throw new Error(j.error || `Checkout failed (${res.status})`);
        window.location.href = j.url;
        return;
      }
      const res = await fetch("/api/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) throw new Error();
      setState("done");
    } catch (e) {
      setErrMsg(e.message || "Something went wrong");
      setState("error");
    }
  }

  return (
    <>
    <button
      className={ghost ? "btn btn-ghost" : "btn btn-primary"}
      onClick={click}
      disabled={state === "busy"}
      style={{ justifyContent: "center", marginTop: 14 }}
    >
      {state === "done" ? "You're on the founders list ✓"
        : state === "busy" ? "…"
        : state === "error" ? "Try again"
        : (label || "Get Pro →")}
    </button>
    {state === "error" && errMsg && (
      <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10.5, color: "#FCA5A5", marginTop: 8, textAlign: "center" }}>✕ {errMsg}</p>
    )}
    </>
  );
}
