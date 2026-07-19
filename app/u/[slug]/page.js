import { notFound } from "next/navigation";
import Portfolio from "@/components/Portfolio";
import { getRedis } from "@/lib/redis";
import { SITE_NAME } from "@/lib/site";

export const dynamic = "force-dynamic";

async function getPage(slug, track = false) {
  try {
    const redis = getRedis();
    const rec = await redis.get(`page:${slug}`);
    if (track && rec?.data) {
      // View tracking — best-effort, never blocks render
      try {
        const day = new Date().toISOString().slice(0, 10);
        await Promise.all([
          redis.incr(`views:${slug}`),
          redis.incr(`views:${slug}:${day}`),
        ]);
      } catch {}
    }
    return rec;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const rec = await getPage(params.slug);
  if (!rec?.data) return { title: SITE_NAME };
  const d = rec.data;
  const title = `${d.name} — ${d.headline?.lead || "Portfolio"}`;
  const description = d.lede || "";
  return {
    title,
    description,
    openGraph: { title, description, type: "profile" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function UserPage({ params }) {
  const rec = await getPage(params.slug, true);
  if (!rec?.data) notFound();
  const d = rec.data;

  return (
    <main id="top">
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="#top">
            <span className="brand-mark">{d.initials || (d.name || "??").split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase()}</span>
            {d.name}
          </a>
          <nav className="nav" aria-label="Main">
            <a href="#top-projects">Projects</a>
            <a href="#experience">Experience</a>
            <a href="#skills">Skills</a>
            <a className="cta" href="#contact">Contact</a>
          </nav>
        </div>
      </header>
      <Portfolio data={d} />
      <div style={{ textAlign: "center", padding: "0 0 34px", position: "relative", zIndex: 2 }}>
        <a href="/" style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--muted)" }}>
          ⚡ Built with {SITE_NAME} — create yours
        </a>
      </div>
    </main>
  );
}
