"use client";

import { useState } from "react";
import { createClient, supabaseConfigured } from "@/lib/supabase/client";

export default function UpgradeCta({ plan, label }) {
  const [state, setState] = useState("idle"); // idle | busy | done | error

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
      const res = await fetch("/api/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) throw new Error();
      setState("done");
    } catch {
      setState("error");
    }
  }

  return (
    <button
      className="btn btn-primary"
      onClick={click}
      disabled={state === "busy"}
      style={{ justifyContent: "center", marginTop: 14 }}
    >
      {state === "done" ? "You're on the founders list ✓"
        : state === "busy" ? "…"
        : state === "error" ? "Try again"
        : (label || "Get Pro →")}
    </button>
  );
}
