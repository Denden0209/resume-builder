import { getRedis } from "@/lib/redis";
import { SITE_NAME } from "@/lib/site";
import MobileNav from "@/components/MobileNav";
import AdminGrant from "@/components/AdminGrant";

export const dynamic = "force-dynamic";
export const metadata = { title: `Owner Dashboard — ${SITE_NAME}`, robots: { index: false } };

function fmtDate(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

async function loadDashboard() {
  const redis = getRedis();

  // Registry: newest first
  const slugs = await redis.zrange("registry:pages", 0, 499, { rev: true });

  // Totals + last 14 days
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - i * 86400000);
    return d.toISOString().slice(0, 10);
  });
  const [parses, publishes, interest, ...daily] = await Promise.all([
    redis.get("stats:parses"),
    redis.get("stats:publishes"),
    redis.get("stats:interest"),
    ...days.map((d) => redis.get(`stats:parses:${d}`)),
    ...days.map((d) => redis.get(`stats:publishes:${d}`)),
  ]);
  const dailyParses = daily.slice(0, 14);
  const dailyPublishes = daily.slice(14);

  // Subscribers: derive owner ids from published pages, then read their plans
  const ownerIds = new Set();
  // (recs fetched below reuse this)

  // Page details (registry may predate some deletions; filter nulls)
  const pages = [];
  if (slugs.length) {
    const recs = await Promise.all(slugs.map((s) => redis.get(`page:${s}`)));
    recs.forEach((rec, i) => {
      if (rec?.data) {
        pages.push({
          slug: slugs[i],
          name: rec.data.name || "—",
          email: rec.data.email || "—",
          field: rec.data.profession?.field || "—",
          location: rec.data.location || "—",
          createdAt: rec.createdAt,
          ownerId: rec.ownerId || null,
        });
        if (rec.ownerId) ownerIds.add(rec.ownerId);
      }
    });
  }

  // Read plan records for every known owner; keep only paying (pro) ones
  const idArr = [...ownerIds];
  const planRecs = idArr.length ? await Promise.all(idArr.map((id) => redis.get(`plan:${id}`))) : [];
  const subscribers = [];
  idArr.forEach((id, i) => {
    const pr = planRecs[i];
    if (pr && pr.tier === "pro" && (!pr.expiresAt || pr.expiresAt > Date.now())) {
      const owned = pages.find((pg) => pg.ownerId === id);
      subscribers.push({
        name: owned?.name || "—",
        email: owned?.email || "—",
        kind: pr.source === "stripe-subscription" ? "Monthly sub"
            : pr.source === "stripe-pass" ? "90-day pass"
            : pr.grantedBy === "manual" ? "Manual grant" : "Pro",
        expiresAt: pr.expiresAt || null,
      });
    }
  });
  const paidCount = await redis.get("stats:paid");

  return {
    parses: +(parses || 0),
    publishes: +(publishes || 0),
    interest: +(interest || 0),
    subscribers,
    paidCount: +(paidCount || 0),
    days: days.map((d, i) => ({ day: d.slice(5), parses: +(dailyParses[i] || 0), publishes: +(dailyPublishes[i] || 0) })).reverse(),
    pages,
  };
}

export default async function AdminPage({ searchParams }) {
  const adminKey = process.env.ADMIN_KEY;
  const ownerEmail = process.env.OWNER_EMAIL;

  // Two ways in: ?key=ADMIN_KEY, or signed in with Google as OWNER_EMAIL
  let authorized = !!(adminKey && searchParams?.key === adminKey);
  if (!authorized && ownerEmail) {
    const { getUser } = await import("@/lib/supabase/server");
    const user = await getUser();
    authorized = !!(user?.email && user.email.toLowerCase() === ownerEmail.toLowerCase());
  }

  if (!authorized) {
    return (
      <main style={{ minHeight: "70vh", display: "grid", placeItems: "center", position: "relative", zIndex: 2 }}>
        <div style={{ textAlign: "center", maxWidth: 460, padding: 24 }}>
          <p className="eyebrow" style={{ justifyContent: "center" }}>Restricted · Owner access</p>
          <h1 style={{ textTransform: "uppercase", fontSize: 30 }}>Owner dashboard</h1>
          <p style={{ color: "var(--muted)", margin: "12px 0" }}>
            {adminKey || ownerEmail
              ? "Sign in with Google as the owner account, or access with /admin?key=YOUR_ADMIN_KEY"
              : "Set an ADMIN_KEY (and optionally OWNER_EMAIL) environment variable in Vercel, redeploy, then return here."}
          </p>
        </div>
      </main>
    );
  }

  let dash;
  try {
    dash = await loadDashboard();
  } catch (e) {
    return (
      <main style={{ padding: 40, position: "relative", zIndex: 2 }}>
        <h1 style={{ textTransform: "uppercase" }}>Dashboard error</h1>
        <p style={{ color: "var(--muted)" }}>{String(e.message)}</p>
      </main>
    );
  }

  const maxDay = Math.max(1, ...dash.days.map((d) => Math.max(d.parses, d.publishes)));
  const conversion = dash.parses ? Math.round((dash.publishes / dash.parses) * 100) : 0;

  return (
    <main style={{ position: "relative", zIndex: 2 }}>
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="/"><span className="brand-mark">⌘</span>Owner Dashboard</a>
          <MobileNav><a className="cta" href="/">← Site</a></MobileNav>
        </div>
      </header>

      <section style={{ paddingTop: 44 }}>
        <div className="sec-head">
          <span className="eyebrow">Platform metrics</span>
          <h2>Usage</h2>
        </div>
        <div className="kpis" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", marginBottom: 26 }}>
          <div className="kpi"><b>{dash.parses}</b><span>Resumes parsed</span></div>
          <div className="kpi"><b>{dash.publishes}</b><span>Pages published</span></div>
          <div className="kpi"><b>{conversion}%</b><span>Parse → publish rate</span></div>
          <div className="kpi ai-kpi"><b>{dash.pages.length}</b><span>Live pages</span></div>
          <div className="kpi"><b>{dash.interest}</b><span>Upgrade clicks</span></div>
          <div className="kpi ai-kpi"><b>{dash.subscribers.length}</b><span>Active subscribers</span></div>
        </div>

        <div className="spark-wrap" style={{ marginBottom: 40 }}>
          <div className="spark-label"><span>Last 14 days — parses vs publishes</span><em>▲ LIVE</em></div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 110, padding: "8px 4px 0" }}>
            {dash.days.map((d) => (
              <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 80, width: "100%", justifyContent: "center" }}>
                  <div title={`${d.parses} parses`} style={{ width: "38%", height: `${(d.parses / maxDay) * 100}%`, minHeight: d.parses ? 3 : 0, background: "linear-gradient(180deg,var(--sky),var(--cerulean))", borderRadius: 3, boxShadow: "0 0 8px rgba(137,194,217,.5)" }} />
                  <div title={`${d.publishes} publishes`} style={{ width: "38%", height: `${(d.publishes / maxDay) * 100}%`, minHeight: d.publishes ? 3 : 0, background: "linear-gradient(180deg,var(--bright),var(--air))", borderRadius: 3, boxShadow: "0 0 10px rgba(169,214,229,.6)" }} />
                </div>
                <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 8.5, color: "var(--muted)" }}>{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="sec-head">
          <span className="eyebrow">{dash.subscribers.length} paying</span>
          <h2>Active subscribers</h2>
        </div>
        <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: 12, background: "rgba(1,42,74,.35)", marginBottom: 34 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead><tr>
              {["Name", "Email", "Plan", "Renews / Expires"].map((hh) => (
                <th key={hh} style={{ textAlign: "left", padding: "12px 16px", fontFamily: "IBM Plex Mono, monospace", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--sky)", borderBottom: "1px solid var(--line)" }}>{hh}</th>
              ))}
            </tr></thead>
            <tbody>
              {dash.subscribers.map((su, i) => (
                <tr key={i} style={{ borderBottom: "1px solid rgba(97,165,194,.1)" }}>
                  <td style={{ padding: "11px 16px", color: "var(--ink)", fontWeight: 600 }}>{su.name}</td>
                  <td style={{ padding: "11px 16px", color: "var(--muted)" }}>{su.email}</td>
                  <td style={{ padding: "11px 16px", color: "var(--bright)" }}>{su.kind}</td>
                  <td style={{ padding: "11px 16px", color: "var(--muted)", fontFamily: "IBM Plex Mono, monospace", fontSize: 11.5 }}>{su.expiresAt ? fmtDate(su.expiresAt) : "ongoing"}</td>
                </tr>
              ))}
              {dash.subscribers.length === 0 && (
                <tr><td colSpan={4} style={{ padding: 20, color: "var(--muted)", textAlign: "center" }}>No active subscribers yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="sec-head">
          <span className="eyebrow">{dash.pages.length} live pages</span>
          <h2>Published portfolios</h2>
        </div>
        <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: 12, background: "rgba(1,42,74,.35)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr>
                {["Name", "Slug", "Field", "Email", "Location", "Published"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontFamily: "IBM Plex Mono, monospace", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--sky)", borderBottom: "1px solid var(--line)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dash.pages.map((p) => (
                <tr key={p.slug} style={{ borderBottom: "1px solid rgba(97,165,194,.1)" }}>
                  <td style={{ padding: "11px 16px", color: "var(--ink)", fontWeight: 600 }}>{p.name}</td>
                  <td style={{ padding: "11px 16px" }}><a href={`/u/${p.slug}`} target="_blank" style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 12 }}>/u/{p.slug}</a></td>
                  <td style={{ padding: "11px 16px", color: "var(--muted)" }}>{p.field}</td>
                  <td style={{ padding: "11px 16px", color: "var(--muted)" }}>{p.email}</td>
                  <td style={{ padding: "11px 16px", color: "var(--muted)" }}>{p.location}</td>
                  <td style={{ padding: "11px 16px", color: "var(--muted)", fontFamily: "IBM Plex Mono, monospace", fontSize: 11.5 }}>{fmtDate(p.createdAt)}</td>
                </tr>
              ))}
              {dash.pages.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 20, color: "var(--muted)", textAlign: "center" }}>No published pages yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <AdminGrant adminKey={searchParams?.key || ""} />
      </section>
    </main>
  );
}
