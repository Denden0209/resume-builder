// Builds a Word resume from portfolio data, modeled on Dennis's CV template:
// Name / title line / contact — Professional Summary — Core Competencies table —
// Professional Experience — Selected High-Impact Projects — Credentials — Education.
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, LevelFormat, BorderStyle, ShadingType,
} from "docx";

const INK = "0D1B2E";
const ACCENT = "0E7C86";
const MUTED = "5A6B80";

function heading(text) {
  return new Paragraph({
    spacing: { before: 220, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ACCENT } },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 22, color: INK, font: "Calibri" })],
  });
}

function bullet(text) {
  return new Paragraph({
    numbering: { reference: "dash", level: 0 },
    spacing: { after: 40 },
    children: [new TextRun({ text, size: 20, font: "Calibri", color: INK })],
  });
}

export async function buildDocx(d) {
  const children = [];

  // Header
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: (d.name || "").toUpperCase(), bold: true, size: 34, font: "Calibri", color: INK })],
  }));
  const titleLine = [d.headline?.lead, d.headline?.accent].filter(Boolean).join(" ");
  if (titleLine) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: titleLine, bold: true, size: 21, font: "Calibri", color: ACCENT })],
    }));
  }
  const contact = [d.phone, d.email, d.linkedin, d.location].filter(Boolean).join("   |   ");
  if (contact) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: contact, size: 18, font: "Calibri", color: MUTED })],
    }));
  }

  // Summary
  if (d.lede) {
    children.push(heading("Professional Summary"));
    children.push(new Paragraph({
      spacing: { after: 80 },
      children: [new TextRun({ text: d.lede, size: 20, font: "Calibri", color: INK })],
    }));
  }

  // Core competencies table (label | items)
  const skills = (d.skills || []).filter((g) => (g.items || []).length);
  if (skills.length) {
    children.push(heading("Core Competencies"));
    const LABEL_W = 2200, ITEMS_W = 7800; // sums to table width (DXA)
    children.push(new Table({
      width: { size: LABEL_W + ITEMS_W, type: WidthType.DXA },
      columnWidths: [LABEL_W, ITEMS_W],
      rows: skills.map((g) => new TableRow({
        children: [
          new TableCell({
            width: { size: LABEL_W, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: "EAF4F5" },
            margins: { top: 60, bottom: 60, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun({ text: g.label, bold: true, size: 19, font: "Calibri", color: INK })] })],
          }),
          new TableCell({
            width: { size: ITEMS_W, type: WidthType.DXA },
            margins: { top: 60, bottom: 60, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun({ text: (g.items || []).join(", "), size: 19, font: "Calibri", color: INK })] })],
          }),
        ],
      })),
    }));
  }

  // Experience (education entries pulled out)
  const jobs = (d.experience || []).filter((x) => x.dates !== "Education");
  const edu = (d.experience || []).filter((x) => x.dates === "Education");
  if (jobs.length) {
    children.push(heading("Professional Experience"));
    for (const x of jobs) {
      children.push(new Paragraph({
        spacing: { before: 120, after: 20 },
        children: [
          new TextRun({ text: x.org || "", bold: true, size: 21, font: "Calibri", color: INK }),
          new TextRun({ text: x.dates ? `   ${x.dates}` : "", italics: true, size: 19, font: "Calibri", color: MUTED }),
        ],
      }));
      if (x.title) {
        children.push(new Paragraph({
          spacing: { after: 40 },
          children: [new TextRun({ text: x.title, bold: true, italics: true, size: 20, font: "Calibri", color: ACCENT })],
        }));
      }
      for (const b of x.bullets || []) children.push(bullet(b));
    }
  }

  // High-impact projects
  if ((d.topProjects || []).length) {
    children.push(heading((d.labels?.highlightsTitle || "Selected High-Impact Projects")));
    for (const p of d.topProjects) {
      const impact = (p.impact || []).join(" · ").replace(/↑\s*/g, "");
      children.push(bullet(`${p.title}${impact ? ` — ${impact}` : ""}`));
    }
  }

  // Credentials
  if ((d.credentials || []).length) {
    children.push(heading("Credentials & Licenses"));
    for (const c of d.credentials) {
      children.push(bullet(`${c.name}${c.issuer ? ` — ${c.issuer}` : ""}`));
    }
  }

  // Education
  if (edu.length) {
    children.push(heading("Education"));
    for (const x of edu) {
      children.push(new Paragraph({
        spacing: { after: 20 },
        children: [new TextRun({ text: [x.title, x.org].filter(Boolean).join(" — "), bold: true, size: 20, font: "Calibri", color: INK })],
      }));
      for (const b of x.bullets || []) children.push(bullet(b));
    }
  }

  const doc = new Document({
    numbering: {
      config: [{
        reference: "dash",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "–", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 360, hanging: 200 } } },
        }],
      }],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 }, // US Letter
          margin: { top: 900, bottom: 900, left: 1000, right: 1000 },
        },
      },
      children,
    }],
  });

  return Packer.toBuffer(doc);
}
