import { headers } from "next/headers";
import { pricesFor } from "@/lib/plans";
import { SITE_NAME, SITE_SHORT } from "@/lib/site";
import AuthButton from "@/components/AuthButton";
import MobileNav from "@/components/MobileNav";
import AdminLink from "@/components/AdminLink";
import UpgradeCta from "@/components/UpgradeCta";
import { stripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const metadata = { title: `Pricing — ${SITE_NAME}` };

function Feature({ children, dim = false }) {
  return (
    <li style={{ fontSize: 14, color: dim ? "var(--muted)" : "var(--ink)", padding: "5px 0 5px 22px", position: "relative" }}>
      <span style={{ position: "absolute", left: 0, color: dim ? "var(--muted)" : "var(--sky)", textShadow: dim ? "none" : "0 0 8px rgba(137,194,217,.7)" }}>{dim ? "—" : "✓"}</span>
      {children}
    </li>
  );
}

export default function PricingPage() {
  const cc = headers().get("x-vercel-ip-country") || "US";
  const live = stripeConfigured();
  const p = pricesFor(cc);

  const card = {
    border: "1px solid var(--line)", borderRadius: 14, padding: "26px 26px 22px",
    background: "rgba(1,42,74,.4)", display: "flex", flexDirection: "column", gap: 4,
  };
  const priceStyle = {
    fontFamily: "Rajdhani, sans-serif", fontSize: 42, fontWeight: 700,
    color: "var(--bright)", lineHeight: 1, textShadow: "0 0 22px rgba(169,214,229,.5)",
  };
  const suffix = { fontFamily: "IBM Plex Mono, monospace", fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted)" };

  return (
    <main style={{ position: "relative", zIndex: 2 }}>
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="/"><span className="brand-mark">{SITE_SHORT}</span>{SITE_NAME}</a>
          <MobileNav>
            <a href="/">Builder</a>
            <a href="/dashboard">My Pages</a>
            <AdminLink />
            <AuthButton />
          </MobileNav>
        </div>
      </header>

      <section style={{ paddingTop: 48 }}>
        <div className="sec-head" style={{ textAlign: "center" }}>
          <span className="eyebrow" style={{ justifyContent: "center" }}><span className="blink"></span>Simple pricing</span>
          <h2 style={{ display: "inline-block" }}>Free to start. Upgrade when it matters.</h2>
          {p.note && (
            <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11, letterSpacing: ".08em", color: "var(--sky)", marginTop: 8 }}>
              ◈ {p.note}
            </p>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))", gap: 16, maxWidth: 1000, margin: "0 auto" }}>

          {/* FREE */}
          <div style={card}>
            <span style={suffix}>Free</span>
            <div style={priceStyle}>$0</div>
            <span style={{ ...suffix, marginBottom: 14 }}>forever</span>
            <ul style={{ listStyle: "none", flex: 1 }}>
              <Feature>1 published portfolio page</Feature>
              <Feature>2 AI resume parses / month</Feature>
              <Feature>Live shareable link + QR code</Feature>
              <Feature>Basic view count</Feature>
              <Feature dim>"Built with {SITE_SHORT}" badge</Feature>
            </ul>
            <a className="btn btn-ghost" href="/" style={{ justifyContent: "center", marginTop: 14 }}>Start free →</a>
          </div>

          {/* PRO */}
          <div style={{ ...card, border: "1px solid rgba(169,214,229,.5)", background: "linear-gradient(160deg, rgba(1,73,124,.55), rgba(1,42,74,.45))", boxShadow: "0 0 34px rgba(1,73,124,.5)" }}>
            <span style={{ ...suffix, color: "var(--bright)" }}>Pro · Most popular</span>
            <div style={priceStyle}>{p.pro}</div>
            <span style={{ ...suffix, marginBottom: 6 }}>{p.proSuffix}</span>
            <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11, color: "var(--sky)", marginBottom: 12 }}>
              or {p.pass} {p.passSuffix} — perfect for a job hunt
            </span>
            <ul style={{ listStyle: "none", flex: 1 }}>
              <Feature>5 published pages — target different roles</Feature>
              <Feature>20 AI parses / month</Feature>
              <Feature>No badge — fully yours</Feature>
              <Feature>Full view analytics (7 &amp; 30-day trends)</Feature>
              <Feature>QR code download (PNG)</Feature>
              <Feature>Priority AI parsing (highest quality model)</Feature>
            </ul>
            <UpgradeCta plan="pro" live={live} product="monthly" label={live ? "Get Pro monthly →" : "Get Pro →"} />
            {live && <UpgradeCta plan="pro" live={live} product="pass" ghost label="Get the 90-day pass →" />}
          </div>

          {/* CAREER+ */}
          <div style={{ ...card, opacity: 0.75 }}>
            <span style={suffix}>Career+ · Coming soon</span>
            <div style={priceStyle}>{p.career}</div>
            <span style={{ ...suffix, marginBottom: 14 }}>/month</span>
            <ul style={{ listStyle: "none", flex: 1 }}>
              <Feature>Custom domain (yourname.com)</Feature>
              <Feature>Unlimited pages &amp; parses</Feature>
              <Feature>AI bullet rewriter</Feature>
              <Feature>Multiple template themes</Feature>
              <Feature>Apple Wallet QR pass</Feature>
            </ul>
            <UpgradeCta plan="career" label="Join the waitlist" live={false} />
          </div>
        </div>

        <p style={{ textAlign: "center", fontFamily: "IBM Plex Mono, monospace", fontSize: 10.5, letterSpacing: ".06em", color: "var(--muted)", marginTop: 28, padding: "0 24px" }}>
          {live
            ? "Secure checkout by Stripe. Cancel anytime from your dashboard. In the Philippines? GCash virtual cards work at checkout."
            : "Payments are launching soon — clicking upgrade adds you to the founders list for early access and launch pricing."}
        </p>
      </section>
    </main>
  );
}
