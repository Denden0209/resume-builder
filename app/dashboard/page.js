import { getRedis } from "@/lib/redis";
import { getUser, supabaseConfigured } from "@/lib/supabase/server";
import { SITE_NAME, SITE_SHORT } from "@/lib/site";
import AuthButton from "@/components/AuthButton";
import MyPages from "@/components/MyPages";

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
          <nav className="nav" aria-label="Main">
            <a href="/">Builder</a>
            <AuthButton />
          </nav>
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
          <MyPages pages={await loadPages(user.id)} />
        </section>
      )}
    </main>
  );
}
