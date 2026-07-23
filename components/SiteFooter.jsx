import { LEGAL } from "@/lib/legal";
import { SITE_NAME } from "@/lib/site";

export default function SiteFooter() {
  const link = { color: "var(--muted)", fontSize: 11, letterSpacing: ".08em" };
  return (
    <footer className="site-footer" style={{ position: "relative", zIndex: 2, borderTop: "1px solid var(--line)", marginTop: 40 }}>
      <div className="wrap" style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "22px 24px", fontFamily: "IBM Plex Mono, monospace", fontSize: 11,
        color: "var(--muted)", letterSpacing: ".08em", flexWrap: "wrap", gap: 12,
      }}>
        <span>© {new Date().getFullYear()} {SITE_NAME} · {LEGAL.company}</span>
        <span style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <a href="/privacy" style={link}>Privacy</a>
          <a href="/terms" style={link}>Terms</a>
          <a href={`mailto:${LEGAL.contactEmail}`} style={link}>Support</a>
        </span>
      </div>
    </footer>
  );
}
