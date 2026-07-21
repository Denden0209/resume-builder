import Builder from "@/components/Builder";
import AuthButton from "@/components/AuthButton";
import MobileNav from "@/components/MobileNav";
import AdminLink from "@/components/AdminLink";
import { SITE_NAME, SITE_SHORT, SITE_TAGLINE } from "@/lib/site";

export default function Home() {
  return (
    <main id="top">
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="#top">
            <span className="brand-mark">{SITE_SHORT}</span>
            {SITE_NAME}
          </a>
          <MobileNav>
            <a href="/pricing">Pricing</a>
            <AdminLink />
            <AuthButton />
            <a className="cta" href="#builder">Build mine →</a>
          </MobileNav>
        </div>
      </header>

      <div className="landing-hero">
        <span className="eyebrow" style={{ justifyContent: "center" }}>
          <span className="blink"></span>Resume → live portfolio · powered by AI
        </span>
        <h1>
          Your resume, reborn as a <span className="accent">stunning live website.</span>
        </h1>
        <p className="lede">{SITE_TAGLINE} AI reads your resume, finds your most
          impressive metrics, ranks your best projects, and deploys a futuristic
          portfolio page you can share with any recruiter.</p>
      </div>

      <div className="landing-steps">
        <div className="step"><i>STEP 01</i><h3>Upload</h3><p>Drop in your resume — PDF, DOCX, or TXT.</p></div>
        <div className="step"><i>STEP 02</i><h3>Review</h3><p>AI builds your page. Tweak anything in the live preview.</p></div>
        <div className="step"><i>STEP 03</i><h3>Share</h3><p>Publish to a live link and send it to recruiters.</p></div>
      </div>

      <Builder />

      <footer className="site-footer">
        <div className="wrap" style={{ display: "flex", justifyContent: "space-between", padding: "24px", fontFamily: "IBM Plex Mono, monospace", fontSize: 11, color: "var(--muted)", letterSpacing: ".08em", flexWrap: "wrap", gap: 10 }}>
          <span>© {new Date().getFullYear()} {SITE_NAME}</span>
          <span>Built with AI</span>
        </div>
      </footer>
    </main>
  );
}
