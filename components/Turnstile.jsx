"use client";

import { useEffect, useRef, useState } from "react";

// Renders the Turnstile widget and reports its token upward.
// Renders nothing when the site key isn't configured.
export default function Turnstile({ onToken }) {
  const ref = useRef(null);
  const [ready, setReady] = useState(false);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey) return;
    // load script once
    if (!document.getElementById("cf-turnstile-script")) {
      const s = document.createElement("script");
      s.id = "cf-turnstile-script";
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.defer = true;
      s.onload = () => setReady(true);
      document.head.appendChild(s);
    } else if (window.turnstile) {
      setReady(true);
    }
  }, [siteKey]);

  useEffect(() => {
    if (!ready || !siteKey || !ref.current || ref.current.dataset.rendered) return;
    try {
      window.turnstile.render(ref.current, {
        sitekey: siteKey,
        theme: "dark",
        callback: (token) => onToken?.(token),
        "error-callback": () => onToken?.(""),
        "expired-callback": () => onToken?.(""),
      });
      ref.current.dataset.rendered = "1";
    } catch (e) {
      console.error("turnstile render failed", e);
    }
  }, [ready, siteKey, onToken]);

  if (!siteKey) return null;
  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
      <div ref={ref}></div>
    </div>
  );
}
