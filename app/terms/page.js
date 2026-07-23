import { LEGAL } from "@/lib/legal";
import { SITE_NAME, SITE_SHORT } from "@/lib/site";
import AuthButton from "@/components/AuthButton";
import MobileNav from "@/components/MobileNav";
import AdminLink from "@/components/AdminLink";
import SiteFooter from "@/components/SiteFooter";

export const metadata = { title: `Terms of Service — ${SITE_NAME}` };

const h2 = { fontSize: 19, marginTop: 30, marginBottom: 8, letterSpacing: ".02em" };
const p = { color: "var(--muted)", fontSize: 14.5, marginBottom: 10, maxWidth: "72ch" };
const li = { color: "var(--muted)", fontSize: 14.5, marginBottom: 6, paddingLeft: 18, position: "relative", maxWidth: "72ch" };

function Li({ children }) {
  return <li style={li}><span style={{ position: "absolute", left: 0, color: "var(--sky)" }}>▸</span>{children}</li>;
}

export default function TermsPage() {
  return (
    <main style={{ position: "relative", zIndex: 2 }}>
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="/"><span className="brand-mark">{SITE_SHORT}</span>{SITE_NAME}</a>
          <MobileNav>
            <a href="/">Builder</a>
            <a href="/pricing">Pricing</a>
            <a href="/dashboard">My Pages</a>
            <AdminLink />
            <AuthButton />
          </MobileNav>
        </div>
      </header>

      <section style={{ paddingTop: 44, maxWidth: 900 }}>
        <span className="eyebrow">Legal</span>
        <h2 style={{ fontSize: 30 }}>Terms of Service</h2>
        <p style={{ ...p, fontFamily: "IBM Plex Mono, monospace", fontSize: 11, letterSpacing: ".08em", marginTop: 12 }}>
          Effective {LEGAL.effectiveDate} · {LEGAL.company}
        </p>

        <p style={p}>
          By using {LEGAL.product} (&quot;the Service&quot;), you agree to these terms. If you don&apos;t
          agree, please don&apos;t use the Service.
        </p>

        <h3 style={h2}>What the Service does</h3>
        <p style={p}>
          The Service uses AI to convert a resume you provide into a shareable personal website, and
          offers optional tools to rewrite content, tailor it to a job description, and export it as
          a PDF or Word document.
        </p>

        <h3 style={h2}>Your account</h3>
        <ul style={{ listStyle: "none" }}>
          <Li>You must be at least 16 years old to use the Service.</Li>
          <Li>You are responsible for activity under your account.</Li>
          <Li>We may suspend or terminate accounts that violate these terms or abuse the Service.</Li>
        </ul>

        <h3 style={h2}>Your content</h3>
        <p style={p}>
          <strong style={{ color: "var(--ink)" }}>You own your content.</strong> You keep all rights to
          the resume content you provide and the pages you publish. You grant us only the limited
          license needed to process, store, and display that content in order to operate the Service.
        </p>
        <p style={p}>
          You represent that the content you upload is yours to use, is accurate to the best of your
          knowledge, and does not infringe anyone&apos;s rights.
        </p>

        <h3 style={h2}>AI-generated output — important</h3>
        <p style={p}>
          The Service uses AI to reformat and rephrase your content. AI can make mistakes.{" "}
          <strong style={{ color: "var(--ink)" }}>You are responsible for reviewing everything before you publish or
          submit it to an employer.</strong> We provide a review step for exactly this reason. We do not
          guarantee that generated content is accurate, error-free, or suitable for any particular
          application, and we are not responsible for the outcome of any job application.
        </p>

        <h3 style={h2}>Acceptable use</h3>
        <p style={p}>You agree not to:</p>
        <ul style={{ listStyle: "none" }}>
          <Li>Upload content that is not yours, or impersonate another person.</Li>
          <Li>Publish content that is unlawful, hateful, harassing, deceptive, or infringing.</Li>
          <Li>Attempt to bypass rate limits, plan limits, or bot protection; or automate, scrape, or overload the Service.</Li>
          <Li>Reverse engineer, resell, or white-label the Service without written permission.</Li>
          <Li>Use the Service to generate deliberately false credentials or fraudulent qualifications.</Li>
        </ul>
        <p style={p}>
          We may remove any published page that violates these rules, and may report unlawful activity.
        </p>

        <h3 style={h2}>Plans, billing, and refunds</h3>
        <ul style={{ listStyle: "none" }}>
          <Li>Free accounts include limited pages and AI generations. Paid plans increase those limits and unlock additional features.</Li>
          <Li>Subscriptions renew automatically until cancelled. You can cancel at any time; access continues through the end of the paid period.</Li>
          <Li>One-time passes grant access for the stated period and do not renew.</Li>
          <Li>Prices may vary by region and may change; changes will not affect an in-progress paid period.</Li>
          <Li><strong>Refunds:</strong> if the Service fails to work for you, email {LEGAL.contactEmail} within 14 days of purchase and we will review your request in good faith.</Li>
          <Li>Payments are handled by Stripe and subject to their terms.</Li>
        </ul>

        <h3 style={h2}>If your plan ends</h3>
        <p style={p}>
          If a paid plan lapses, your pages are not deleted. Pages beyond the free plan&apos;s limit may
          become unavailable until you upgrade again or delete others, and paid-only features stop
          working. We will not delete your content because of a lapsed plan.
        </p>

        <h3 style={h2}>Availability</h3>
        <p style={p}>
          The Service is provided &quot;as is&quot; and &quot;as available.&quot; We don&apos;t guarantee
          uninterrupted access, and we may modify or discontinue features. We&apos;ll make reasonable
          efforts to notify users of significant changes.
        </p>

        <h3 style={h2}>Limitation of liability</h3>
        <p style={p}>
          To the maximum extent permitted by law, {LEGAL.company} is not liable for indirect,
          incidental, or consequential damages, including lost job opportunities, lost profits, or
          lost data. Our total liability for any claim is limited to the amount you paid us in the
          twelve months before the claim.
        </p>

        <h3 style={h2}>Governing law</h3>
        <p style={p}>
          These terms are governed by the laws of {LEGAL.jurisdiction}, without regard to conflict of
          law rules.
        </p>

        <h3 style={h2}>Changes to these terms</h3>
        <p style={p}>
          We may update these terms; we&apos;ll revise the effective date above. Continued use after
          changes means you accept them.
        </p>

        <h3 style={h2}>Contact</h3>
        <p style={p}>
          <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>
        </p>
      </section>
          <SiteFooter />
    </main>
  );
}
