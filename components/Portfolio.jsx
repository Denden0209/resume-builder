"use client";

import { useEffect, useRef, useState } from "react";

// Bold the numbers/metrics inside a bullet automatically
function emphasize(text) {
  const parts = String(text).split(/((?:\$?\d[\d,.]*\s?(?:K\+?|M\+?|%|\+|hrs?|hours)?)|(?:\d+\+))/g);
  return parts.map((p, i) =>
    /\d/.test(p) && p.trim() ? <b key={i}>{p}</b> : <span key={i}>{p}</span>
  );
}

function Kpi({ k }) {
  return (
    <div className={"kpi" + (k.ai ? " ai-kpi" : "")}>
      <b className="cnt" data-count={k.value} data-prefix={k.prefix || ""} data-suffix={k.suffix || ""}>
        0
      </b>
      <span>{k.label}</span>
    </div>
  );
}

export default function Portfolio({ data, compact = false }) {
  const root = useRef(null);
  const [filter, setFilter] = useState("all");
  const [openMore, setOpenMore] = useState({});

  const d = data;
  const orgs = [...new Set((d.projectIndex || []).map((p) => p.org).filter(Boolean))].slice(0, 3);

  // ---------- effects ----------
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cleanups = [];

    // Particle network
    const canvas = el.querySelector("canvas.netc");
    if (canvas && !reduced) {
      const ctx = canvas.getContext("2d");
      let w, h, pts, raf;
      const resize = () => {
        w = canvas.width = el.clientWidth;
        h = canvas.height = Math.min(el.scrollHeight, 4000);
        const n = Math.min(70, Math.floor((w * Math.min(h, 1200)) / 22000));
        pts = Array.from({ length: n }, () => ({
          x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
          r: Math.random() * 1.6 + 0.6,
        }));
      };
      resize();
      window.addEventListener("resize", resize);
      const frame = () => {
        ctx.clearRect(0, 0, w, h);
        for (const p of pts) {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > w) p.vx *= -1;
          if (p.y < 0 || p.y > h) p.vy *= -1;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(137,194,217,.5)"; ctx.fill();
        }
        for (let i = 0; i < pts.length; i++)
          for (let j = i + 1; j < pts.length; j++) {
            const a = pts[i], b = pts[j];
            const dd = Math.hypot(a.x - b.x, a.y - b.y);
            if (dd < 140) {
              ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
              ctx.strokeStyle = `rgba(97,165,194,${(1 - dd / 140) * 0.25})`;
              ctx.lineWidth = 1; ctx.stroke();
            }
          }
        raf = requestAnimationFrame(frame);
      };
      frame();
      cleanups.push(() => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); });
    }

    // Count-ups
    const countUp = (node) => {
      const target = +node.dataset.count, prefix = node.dataset.prefix || "", suffix = node.dataset.suffix || "";
      if (reduced || isNaN(target)) { node.textContent = prefix + (target || 0) + suffix; return; }
      const dur = 1300, start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        node.textContent = prefix + Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    el.querySelectorAll(".cnt").forEach(countUp);

    // Headline decode
    const h1 = el.querySelector("h1.decode");
    if (h1 && !reduced) {
      const CHARS = "01<>/\\|#$%&@ABCDEF";
      const nodes = [];
      (function collect(n) {
        n.childNodes.forEach((c) => (c.nodeType === 3 ? nodes.push(c) : collect(c)));
      })(h1);
      const originals = nodes.map((n) => n.textContent);
      const total = originals.join("").length;
      let progress = 0;
      const step = Math.max(1, Math.round(total / 40));
      let t;
      const scramble = () => {
        progress += step;
        let seen = 0;
        nodes.forEach((n, i) => {
          const orig = originals[i];
          let out = "";
          for (let k = 0; k < orig.length; k++) {
            if (orig[k] === " ") { out += " "; continue; }
            out += seen + k < progress ? orig[k] : CHARS[(Math.random() * CHARS.length) | 0];
          }
          n.textContent = out; seen += orig.length;
        });
        if (progress < total) t = setTimeout(scramble, 28);
        else nodes.forEach((n, i) => (n.textContent = originals[i]));
      };
      scramble();
      cleanups.push(() => clearTimeout(t));
    }

    // Terminal typing
    const term = el.querySelector(".dash-term span.t");
    if (term) {
      const SEQ = `> initializing profile... [ok]# ${(d.topProjects || []).length + (d.projectIndex || []).length}+ career modules loaded... [ok]# systems online`;
      const render = (s) => { term.innerHTML = s.replaceAll("[ok]", '<span class="ok">✓</span>'); };
      if (reduced) render(SEQ.split("#").join("  "));
      else {
        let i = 0, out = "", t;
        const type = () => {
          if (i >= SEQ.length) return;
          const ch = SEQ[i++];
          if (ch === "#") { out = ""; term.innerHTML = ""; t = setTimeout(type, 420); return; }
          out += ch; render(out);
          t = setTimeout(type, ch === "." ? 90 : 26 + Math.random() * 30);
        };
        type();
        cleanups.push(() => clearTimeout(t));
      }
    }

    // Sparkline draw
    const line = el.querySelector("#sparkLine");
    if (line && !reduced) {
      const len = line.getTotalLength();
      line.style.strokeDasharray = len;
      line.style.strokeDashoffset = len;
      line.getBoundingClientRect();
      line.style.transition = "stroke-dashoffset 1.8s ease-out .3s";
      line.style.strokeDashoffset = "0";
    }

    // Ticker duplicate for seamless loop
    const track = el.querySelector(".ticker-track");
    if (track && !track.dataset.dup) { track.innerHTML += track.innerHTML; track.dataset.dup = "1"; }

    // Entrance variants + reveal observer
    el.querySelectorAll(".rank-card").forEach((c, i) => c.classList.add(i % 2 ? "slide-r" : "slide-l"));
    const ANIMS = ["anim-a", "anim-b", "anim-c", "anim-d"];
    el.querySelectorAll(".t-item").forEach((t, i) => t.classList.add(ANIMS[i % ANIMS.length]));
    el.querySelectorAll(".index-item").forEach((it, i) => it.style.setProperty("--d", ((i % 8) * 0.06) + "s"));
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
      { threshold: 0.08, root: compact ? el.closest(".preview-scale") : null }
    );
    el.querySelectorAll(".reveal").forEach((n) => io.observe(n));
    cleanups.push(() => io.disconnect());

    // Console tilt
    const dash = el.querySelector(".dash");
    if (dash && !reduced && !matchMedia("(hover: none)").matches) {
      const MAX = 7;
      const move = (e) => {
        const r = dash.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        dash.classList.add("tilting"); dash.classList.remove("untilt");
        dash.style.transform = `perspective(900px) rotateY(${x * MAX}deg) rotateX(${-y * MAX}deg)`;
      };
      const leave = () => {
        dash.classList.remove("tilting"); dash.classList.add("untilt");
        dash.style.transform = "perspective(900px) rotateY(0deg) rotateX(0deg)";
      };
      dash.addEventListener("mousemove", move);
      dash.addEventListener("mouseleave", leave);
      cleanups.push(() => { dash.removeEventListener("mousemove", move); dash.removeEventListener("mouseleave", leave); });
    }

    return () => cleanups.forEach((f) => f());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const visibleIndex = (d.projectIndex || []).filter(
    (p) => filter === "all" || p.category === filter || (p.org || "").toLowerCase() === filter
  );

  return (
    <div ref={root} style={{ position: "relative", overflow: "hidden" }}>
      <canvas className="netc" aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", opacity: 0.5 }} />
      <div style={{ position: "relative", zIndex: 2 }}>

        {/* HERO */}
        <div className="hero">
          <div>
            <span className="eyebrow"><span className="blink"></span>{d.eyebrow}</span>
            <h1 className="decode">
              {d.headline?.lead} <span className="accent">{d.headline?.accent}</span>
            </h1>
            <p className="lede">{d.lede}</p>
            <div className="hero-actions">
              <a className="btn btn-primary" href="#top-projects">View my work</a>
              {d.linkedin ? (
                <a className="btn btn-ghost" href={d.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn ↗</a>
              ) : null}
            </div>
          </div>

          <div className="dash hud" aria-label="Career metrics console">
            <div className="dash-head">
              <span className="dash-title">{d.consoleTitle || (d.name || "profile").toLowerCase().replace(/\s+/g, "_") + ".pbix"}</span>
              <span className="dash-live"><i></i>Live</span>
            </div>
            <div className="dash-term" aria-hidden="true"><span className="t"></span><span className="cursor"></span></div>
            <div className="dash-body">
              <div className="kpis">
                {(d.kpis || []).slice(0, 4).map((k, i) => <Kpi key={i} k={{ ...k, ai: i === 3 }} />)}
              </div>
              <div className="spark-wrap">
                <div className="spark-label"><span>Career trajectory</span><em>▲ TRENDING UP</em></div>
                <div className="spark">
                  <svg viewBox="0 0 400 90" preserveAspectRatio="none" aria-hidden="true">
                    <defs>
                      <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#89C2D9" stopOpacity=".3" />
                        <stop offset="100%" stopColor="#89C2D9" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path className="fill" d="M0,82 C60,78 90,70 140,60 C190,50 230,44 280,30 C320,19 360,12 400,6 L400,90 L0,90 Z" />
                    <path className="line" id="sparkLine" d="M0,82 C60,78 90,70 140,60 C190,50 230,44 280,30 C320,19 360,12 400,6" />
                    <circle className="dot" cx="400" cy="6" r="5" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TICKER */}
        {(d.ticker || []).length > 0 && (
          <div className="ticker" aria-hidden="true">
            <div className="ticker-track">
              {d.ticker.map((t, i) => <span key={i}>{emphasize(t)}</span>)}
            </div>
          </div>
        )}

        {/* TOP PROJECTS */}
        {(d.topProjects || []).length > 0 && (
          <section id="top-projects">
            <div className="sec-head reveal">
              <span className="eyebrow">{d.labels?.highlightsEyebrow || "Ranked · Highest impact"}</span>
              <h2>{d.labels?.highlightsTitle || "Top projects"}</h2>
            </div>
            <div className="rank-list">
              {d.topProjects.map((p, i) => (
                <article className="rank-card reveal" key={i}>
                  <div className="rank-inner">
                    <div className="rank-num">{String(i + 1).padStart(2, "0")}{i === 0 && <small>Flagship</small>}</div>
                    <div className="rank-body">
                      <div className="rank-tags">
                        {(p.tags || []).map((t, j) => <span key={j} className={"tag " + (t.kind || "type")}>{t.text}</span>)}
                      </div>
                      <h3>{p.title}</h3>
                      <p>{p.description}</p>
                      <ul>{(p.bullets || []).map((b, j) => <li key={j}>{emphasize(b)}</li>)}</ul>
                      {(p.impact || []).length > 0 && (
                        <div className="impact">{p.impact.map((im, j) => <span key={j}>{im}</span>)}</div>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* PROJECT INDEX */}
        {(d.projectIndex || []).length > 0 && (
          <section id="project-index">
            <div className="sec-head reveal">
              <span className="eyebrow">{d.labels?.indexEyebrow || "Full portfolio"}</span>
              <h2>{d.labels?.indexTitle || "Project index"}</h2>
            </div>
            <div className="filters" role="group" aria-label="Filter items">
              {(() => {
                const cats = (d.labels?.categories || [
                  { id: "data", label: "Data & Dashboards" },
                  { id: "automation", label: "Automation & Apps" },
                ]).filter((c) => (d.projectIndex || []).some((p) => p.category === c.id));
                const catLabel = (id) => cats.find((c) => c.id === id)?.label || id;
                return ["all", ...orgs.map((o) => o.toLowerCase()), ...cats.map((c) => c.id)].map((f) => (
                  <button key={f} className={"chip" + (filter === f ? " active" : "")} onClick={() => setFilter(f)}>
                    {f === "all" ? "All"
                      : cats.some((c) => c.id === f) ? catLabel(f)
                      : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ));
              })()}
            </div>
            <div className="index-grid">
              {visibleIndex.map((p, i) => {
                const catLabel = (d.labels?.categories || []).find((c) => c.id === p.category)?.label
                  || (p.category === "automation" ? "Automation" : p.category === "data" ? "Data" : p.category);
                return (
                  <div className="index-item reveal in" key={p.title + i}>
                    <h4>{p.title}</h4>
                    <div className="meta">
                      {p.org && <span className="tag org">{p.org}</span>}
                      {catLabel && <span className="tag type">{catLabel}</span>}
                    </div>
                    {p.team && <span className="team">{p.team}</span>}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* CREDENTIALS */}
        {(d.credentials || []).length > 0 && (
          <section id="credentials">
            <div className="sec-head reveal">
              <span className="eyebrow">Verified</span>
              <h2>Credentials &amp; licenses</h2>
            </div>
            <div className="cred-row reveal">
              {d.credentials.map((c, i) => (
                <div className="cred" key={i}>
                  <b>{c.name}</b>
                  {c.issuer && <span>{c.issuer}</span>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* EXPERIENCE */}
        {(d.experience || []).length > 0 && (
          <section id="experience">
            <div className="sec-head reveal">
              <span className="eyebrow">Career</span>
              <h2>Experience</h2>
            </div>
            <div className="timeline">
              {d.experience.map((x, i) => {
                const bullets = x.bullets || [];
                const first = bullets.slice(0, 5);
                const rest = bullets.slice(5);
                const open = !!openMore[i];
                return (
                  <div className="t-item reveal" key={i}>
                    <span className="t-date">{x.dates}</span>
                    <h3>{x.title}</h3>
                    <div className="org">{x.org}</div>
                    <ul>{first.map((b, j) => <li key={j}>{emphasize(b)}</li>)}</ul>
                    {rest.length > 0 && (
                      <>
                        <div className={"more" + (open ? " open" : "")}>
                          <ul>{rest.map((b, j) => <li key={j}>{emphasize(b)}</li>)}</ul>
                        </div>
                        <button className="see-more" aria-expanded={open}
                          onClick={() => setOpenMore((m) => ({ ...m, [i]: !m[i] }))}>
                          {open ? "See less −" : "See more +"}
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* SKILLS */}
        {(d.skills || []).length > 0 && (
          <section id="skills">
            <div className="sec-head reveal">
              <span className="eyebrow">Toolkit</span>
              <h2>Skills &amp; platforms</h2>
            </div>
            <div className="skill-rows">
              {d.skills.map((g, i) => (
                <div className={"skill-row reveal" + (g.ai ? " ai-row" : "")} key={i}>
                  <span className="label">{g.label}</span>
                  <div className="pills">
                    {(g.items || []).map((s, j) => <span key={j} className={"pill" + (g.ai ? " ai-pill" : "")}>{s}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CONTACT */}
        <section id="contact">
          <div className="contact-band hud reveal">
            <span className="eyebrow"><span className="blink"></span>Let&apos;s connect</span>
            <h2>Let&apos;s talk.</h2>
            <p>{d.contactCta || "Reach out — I'd love to connect."}</p>
            <div className="contact-links">
              {d.email && <a className="btn btn-primary" href={`mailto:${d.email}`}>Email me</a>}
              {d.linkedin && <a className="btn btn-ghost" href={d.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn ↗</a>}
              {d.phone && <a className="btn btn-ghost" href={`tel:${d.phone.replace(/[^+\d]/g, "")}`}>{d.phone}</a>}
            </div>
          </div>
        </section>

        <footer>
          <span>© {new Date().getFullYear()} {d.name}</span>
          <span>{d.location}</span>
        </footer>
      </div>
    </div>
  );
}
