export default function NotFound() {
  return (
    <main style={{ minHeight: "70vh", display: "grid", placeItems: "center", position: "relative", zIndex: 2 }}>
      <div style={{ textAlign: "center" }}>
        <p className="eyebrow" style={{ justifyContent: "center" }}>404 · Signal lost</p>
        <h1 style={{ textTransform: "uppercase", fontSize: 34 }}>Page not found</h1>
        <p style={{ color: "var(--muted)", margin: "10px 0 22px" }}>This portfolio doesn&apos;t exist — or hasn&apos;t been published yet.</p>
        <a className="btn btn-primary" href="/">Build your own →</a>
      </div>
    </main>
  );
}
