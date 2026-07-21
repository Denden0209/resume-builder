// PDF resume mirroring the same CV template, via @react-pdf/renderer (no JSX — route-safe).
import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

const INK = "#0D1B2E", ACCENT = "#0E7C86", MUTED = "#5A6B80", LIGHT = "#EAF4F5";

const s = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 40, paddingHorizontal: 46, fontSize: 9.5, color: INK, fontFamily: "Helvetica" },
  name: { fontSize: 19, fontFamily: "Helvetica-Bold", textAlign: "center" },
  title: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: ACCENT, textAlign: "center", marginTop: 2 },
  contact: { fontSize: 8.5, color: MUTED, textAlign: "center", marginTop: 3, marginBottom: 8 },
  h: { fontSize: 10.5, fontFamily: "Helvetica-Bold", marginTop: 12, marginBottom: 4, paddingBottom: 2, borderBottomWidth: 1, borderBottomColor: ACCENT, textTransform: "uppercase" },
  p: { lineHeight: 1.4 },
  row: { flexDirection: "row", marginBottom: 2 },
  skLabel: { width: "22%", backgroundColor: LIGHT, padding: 4, fontFamily: "Helvetica-Bold", fontSize: 8.5 },
  skItems: { width: "78%", padding: 4, fontSize: 8.5 },
  org: { fontFamily: "Helvetica-Bold", fontSize: 10, marginTop: 8 },
  dates: { fontFamily: "Helvetica-Oblique", color: MUTED, fontSize: 8.5 },
  role: { fontFamily: "Helvetica-BoldOblique", color: ACCENT, fontSize: 9.5, marginBottom: 2 },
  li: { flexDirection: "row", marginBottom: 1.5, paddingLeft: 6 },
  skline: { marginBottom: 3, lineHeight: 1.35 },
  sklabel: { fontFamily: "Helvetica-Bold" },
  liDash: { width: 10 },
  liText: { flex: 1, lineHeight: 1.35 },
});

const e = React.createElement;

function Bullet(text, key) {
  return e(View, { style: s.li, key },
    e(Text, { style: s.liDash }, "–"),
    e(Text, { style: s.liText }, text)
  );
}

function ResumePdf({ d }) {
  const jobs = (d.experience || []).filter((x) => x.dates !== "Education");
  const edu = (d.experience || []).filter((x) => x.dates === "Education");
  const titleLine = [d.headline?.lead, d.headline?.accent].filter(Boolean).join(" ");
  const contact = [d.phone, d.email, d.linkedin, d.location].filter(Boolean).join("   |   ");
  const skills = (d.skills || []).filter((g) => (g.items || []).length);

  return e(Document, { title: `${d.name} — Resume` },
    e(Page, { size: "LETTER", style: s.page },
      e(Text, { style: s.name }, (d.name || "").toUpperCase()),
      titleLine ? e(Text, { style: s.title }, titleLine) : null,
      contact ? e(Text, { style: s.contact }, contact) : null,

      d.lede ? e(React.Fragment, null,
        e(Text, { style: s.h }, "Professional Summary"),
        e(Text, { style: s.p }, d.lede)
      ) : null,

      skills.length ? e(React.Fragment, null,
        e(Text, { style: s.h }, "Relevant Skills & Certifications"),
        ...skills.map((g, i) => e(Text, { style: s.skline, key: i },
          e(Text, { style: s.sklabel }, `${g.label}: `),
          (g.items || []).join(", ")
        ))
      ) : null,

      jobs.length ? e(React.Fragment, null,
        e(Text, { style: s.h }, "Professional Experience"),
        ...jobs.map((x, i) => e(View, { key: i, wrap: true },
          e(Text, { style: s.org }, `${x.org || ""}  `, e(Text, { style: s.dates }, x.dates || "")),
          x.title ? e(Text, { style: s.role }, x.title) : null,
          ...(x.bullets || []).map((b, j) => Bullet(b, j))
        ))
      ) : null,

      (d.topProjects || []).length ? e(React.Fragment, null,
        e(Text, { style: s.h }, d.labels?.highlightsTitle || "Selected High-Impact Projects"),
        ...(d.topProjects || []).map((p, i) => {
          const impact = (p.impact || []).join(" · ").replace(/↑\s*/g, "");
          return Bullet(`${p.title}${impact ? ` — ${impact}` : ""}`, i);
        })
      ) : null,

      (d.credentials || []).length ? e(React.Fragment, null,
        e(Text, { style: s.h }, "Credentials & Licenses"),
        ...(d.credentials || []).map((c, i) => Bullet(`${c.name}${c.issuer ? ` — ${c.issuer}` : ""}`, i))
      ) : null,

      edu.length ? e(React.Fragment, null,
        e(Text, { style: s.h }, "Education"),
        ...edu.map((x, i) => e(View, { key: i },
          e(Text, { style: s.org }, [x.title, x.org].filter(Boolean).join(" — ")),
          ...(x.bullets || []).map((b, j) => Bullet(b, j))
        ))
      ) : null
    )
  );
}

export async function buildPdf(d) {
  return renderToBuffer(e(ResumePdf, { d }));
}
