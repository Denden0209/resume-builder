import { LEGAL } from "@/lib/legal";
import { SITE_NAME, SITE_SHORT } from "@/lib/site";
import AuthButton from "@/components/AuthButton";
import MobileNav from "@/components/MobileNav";
import AdminLink from "@/components/AdminLink";
import SiteFooter from "@/components/SiteFooter";

export const metadata = { title: `Privacy Policy — ${SITE_NAME}` };

const h2 = { fontSize: 19, marginTop: 30, marginBottom: 8, letterSpacing: ".02em" };
const p = { color: "var(--muted)", fontSize: 14.5, marginBottom: 10, maxWidth: "72ch" };
const li = { color: "var(--muted)", fontSize: 14.5, marginBottom: 6, paddingLeft: 18, position: "relative", maxWidth: "72ch" };

function Li({ children }) {
  return <li style={li}><span style={{ position: "absolute", left: 0, color: "var(--sky)" }}>▸</span>{children}</li>;
}

export default function PrivacyPage() {
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
        <h2 style={{ fontSize: 30 }}>Privacy Policy</h2>
        <p style={{ ...p, fontFamily: "IBM Plex Mono, monospace", fontSize: 11, letterSpacing: ".08em", marginTop: 12 }}>
          Effective {LEGAL.effectiveDate} · Operated by {LEGAL.company}
        </p>

        <p style={p}>
          {LEGAL.product} turns your resume into a shareable personal website. This policy explains
          what we collect, what we don&apos;t, and what happens to your data. We&apos;ve written it
          in plain language on purpose.
        </p>

        <h3 style={h2}>The short version</h3>
        <ul style={{ listStyle: "none" }}>
          <Li><strong>We do not store your uploaded resume file.</strong> It is processed in memory to generate your page, then discarded.</Li>
          <Li><strong>Only pages you choose to publish are stored</strong> — and those are public by design, because sharing them is the point.</Li>
          <Li>We never sell your data or share it with advertisers.</Li>
          <Li>You can delete any page — and everything in it — from your dashboard at any time.</Li>
        </ul>

        <h3 style={h2}>What we collect</h3>
        <p style={p}><strong style={{ color: "var(--ink)" }}>Resume content you upload or type.</strong> When you upload a resume (or type your career story), the content is sent to our AI processing provider to generate your page structure. We do not retain the uploaded file itself.</p>
        <p style={p}><strong style={{ color: "var(--ink)" }}>Published page content.</strong> If you click Publish, the generated content (name, experience, projects, skills, and any contact details you include) is stored so your page can be served at its public link.</p>
        <p style={p}><strong style={{ color: "var(--ink)" }}>Account information.</strong> If you sign in with Google, we receive your email address and a user ID from Google. We do not receive your Google password.</p>
        <p style={p}><strong style={{ color: "var(--ink)" }}>Usage data.</strong> We count page views on published pages, and track parse/publish counts to enforce plan limits and detect abuse. We log IP addresses transiently for rate limiting.</p>
        <p style={p}><strong style={{ color: "var(--ink)" }}>Payment information.</strong> Payments are processed by Stripe. We never see or store your card number — we only store whether your account has an active plan.</p>

        <h3 style={h2}>Service providers we use</h3>
        <ul style={{ listStyle: "none" }}>
          <Li><strong>Anthropic (Claude API)</strong> — processes resume content to generate your page. Content sent for processing is not used to train their models under their commercial terms.</Li>
          <Li><strong>Supabase</strong> — authentication (Google sign-in) and account identity.</Li>
          <Li><strong>Upstash Redis</strong> — stores published page content and usage counters.</Li>
          <Li><strong>Vercel</strong> — hosting and content delivery.</Li>
          <Li><strong>Stripe</strong> — payment processing and billing.</Li>
          <Li><strong>Cloudflare</strong> — bot protection on uploads.</Li>
        </ul>

        <h3 style={h2}>Published pages are public</h3>
        <p style={p}>
          Any page you publish is accessible to anyone with the link, and may be indexed by search
          engines. That is the intended purpose — you publish it to share with recruiters and
          contacts. <strong style={{ color: "var(--ink)" }}>Only include information you are comfortable making public.</strong>{" "}
          Consider whether to include your phone number or home location.
        </p>

        <h3 style={h2}>Your rights and choices</h3>
        <ul style={{ listStyle: "none" }}>
          <Li><strong>Delete a page</strong> — from your dashboard, at any time. This removes the content and its view counts.</Li>
          <Li><strong>Delete your account and data</strong> — email {LEGAL.contactEmail} and we will remove your account, pages, and associated records.</Li>
          <Li><strong>Access your data</strong> — email us and we will provide what we hold about you.</Li>
          <Li><strong>Cancel a subscription</strong> — through Stripe or by contacting us; your published pages remain accessible per the plan limits.</Li>
        </ul>
        <p style={p}>
          If you are in the EU/UK or California, you may have additional rights under GDPR or CCPA
          (access, correction, deletion, portability, and objection). Contact us and we will honor them.
        </p>

        <h3 style={h2}>Data retention</h3>
        <p style={p}>
          Uploaded resume files: not retained. Published page content: retained until you delete the
          page or your account. Usage counters: retained on a rolling basis (roughly 40 days for
          monthly quotas). Payment records: retained by Stripe as required by financial regulations.
        </p>

        <h3 style={h2}>Children</h3>
        <p style={p}>
          This service is not directed to anyone under 16, and we do not knowingly collect their data.
        </p>

        <h3 style={h2}>Changes to this policy</h3>
        <p style={p}>
          If we make material changes, we will update the effective date above and, where appropriate,
          notify signed-in users by email.
        </p>

        <h3 style={h2}>Contact</h3>
        <p style={p}>
          Questions, deletion requests, or concerns: <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>
        </p>
      </section>
          <SiteFooter />
    </main>
  );
}
