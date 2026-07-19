"use client";

import { useEffect, useState } from "react";
import { createClient, supabaseConfigured } from "@/lib/supabase/client";

export default function AuthButton() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const enabled = supabaseConfigured();

  useEffect(() => {
    if (!enabled) { setReady(true); return; }
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user || null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null);
    });
    return () => sub?.subscription?.unsubscribe();
  }, [enabled]);

  if (!enabled || !ready) return null;

  if (!user) {
    return (
      <button
        className="cta"
        style={{ border: "none", cursor: "pointer", font: "inherit" }}
        onClick={() => {
          const supabase = createClient();
          supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: `${window.location.origin}/auth/callback` },
          });
        }}
      >
        Sign in with Google
      </button>
    );
  }

  return (
    <>
      <a href="/dashboard">My Pages</a>
      <button
        style={{ background: "none", border: "none", cursor: "pointer", font: "inherit", color: "var(--muted)", padding: "8px 13px", fontFamily: "IBM Plex Mono, monospace", fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase" }}
        onClick={async () => {
          const supabase = createClient();
          await supabase.auth.signOut();
          window.location.href = "/";
        }}
      >
        Sign out
      </button>
    </>
  );
}
