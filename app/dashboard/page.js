import { getRedis } from "@/lib/redis";
import { getUser, supabaseConfigured } from "@/lib/supabase/server";
import { getPlan, limitsFor, getParseUsage, getPageCount } from "@/lib/plan";
import { SITE_NAME, SITE_SHORT } from "@/lib/site";
import AuthButton from "@/components/AuthButton";
import MobileNav from "@/components/MobileNav";
import AdminLink from "@/components/AdminLink";
import SiteFooter from "@/components/SiteFooter";
import MyPages from "@/components/MyPages";

async function PlanBar({ userId }) {
  const { tier, expiresAt } = await getPlan(userId);
  const limits = limitsFor(tier);
  const [parses, pages] = await Promise.all([getParseUsage(userId), getPageCount(userId)]);
  const mono = { fontFamily: "IBM Plex Mono, monospace", fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase" };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap", border: "1px solid var(--line)", borderRadius: 12, background: "rgba(1,42,74,.4)", padding: "13px 18px", marginBottom: 20 }}>
      <span style={{ ...mono, color: tier === "pro" ? "var(--bright)" : "var(--sky)", textShadow: tier === "pro" ? "0 0 10px rgba(169,214,229,.5)" : "none" }}>
        {tier === "pro" ? "◈ Pro plan" : "Free plan"}
        {tier === "pro" && expiresAt ? ` · until ${new Date(expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
      </span>
      <span style={{ ...mono, color: "var(--muted)" }}>Pages {pages}/{limits.pages}</span>
      <span style={{ ...mono, color: "var(--muted)" }}>Parses this month {parses}/{limits.parsesPerMonth}</span>
      {tier !== "pro" && (
        <a href="/pricing" style={{ ...mono, color: "var(--bright)", marginLeft: "auto" }}>Upgrade →</a>
      )}
    </div>
  );
}

export const dynamic = "force-dynamic";
export const metadata = { title: `My Pages — ${SITE_NAME}`, robots: { index: false } };

async function loadPages(userId) {
  const redis = getRedis();
  const slugs = await redis.zrange(`user:${userId}:pages`, 0, 99, { rev: true });
  if (!slugs.length) return [];

  const last7 = Array.from({ length: 7 }, (_, i) =>
    new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
  );

  const recs = await Promise.all(slugs.map((s) => redis.get(`page:${s}`)));
  const totals = await Promise.all(slugs.map((s) => redis.get(`views:${s}`)));
  const weekly = await Promise.all(
    slugs.map((s) => Promise.all(last7.map((d) => redis.get(`views:${s}:${d}`))))
  );

  return slugs
    .map((slug, i) => {
      const rec = recs[i];
      if (!rec?.data) return null;
      return {
        slug,
        name: rec.data.name || slug,
        headline: rec.data.headline?.lead || "",
        createdAt: rec.createdAt || null,
        updatedAt: rec.updatedAt || null,
        views: +(totals[i] || 0),
        views7: weekly[i].reduce((a, v) => a + +(v || 0), 0),
      };
    })
    .filter(Boolean);
}

export default async function DashboardPage() {
  const user = await getUser();

  return (
    <main style={{ position: "relative", zIndex: 2 }}>
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="/"><span className="brand-mark">{SITE_SHORT}</span>{SITE_NAME}</a>
          <MobileNav>
            <a href="/">Builder</a>
            <a href="/pricing">Pricing</a>
            <AdminLink />
            <AuthButton />
          </MobileNav>
        </div>
      </header>

      {!supabaseConfigured() ? (
        <section style={{ textAlign: "center", paddingTop: 90 }}>
          <p className="eyebrow" style={{ justifyContent: "center" }}>Setup needed</p>
          <h2>Accounts aren&apos;t configured yet</h2>
          <p style={{ color: "var(--muted)", marginTop: 10 }}>
            Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel, then redeploy.
          </p>
        </section>
      ) : !user ? (
        <section style={{ textAlign: "center", paddingTop: 90 }}>
          <p className="eyebrow" style={{ justifyContent: "center" }}>Sign in required</p>
          <h2>Your pages live here</h2>
          <p style={{ color: "var(--muted)", margin: "10px 0 22px" }}>
            Sign in with Google to see, edit, and track every portfolio you&apos;ve published.
          </p>
          <div style={{ display: "flex", justifyContent: "center" }}><AuthButton /></div>
        </section>
      ) : (
        <section style={{ paddingTop: 44 }}>
          <div className="sec-head">
            <span className="eyebrow"><span className="blink"></span>{user.email}</span>
            <h2>My pages</h2>
          </div>
          <PlanBar userId={user.id} />
          <MyPages pages={await loadPages(user.id)} />
          <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 9.5, color: "var(--muted)", letterSpacing: ".06em", marginTop: 26 }}>
            Account ID: {user.id}
          </p>
        </section>
      )}
          <SiteFooter />
    </main>
  );
}
