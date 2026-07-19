"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function QrCode({ url, size = 220 }) {
  const [dataUrl, setDataUrl] = useState("");

  useEffect(() => {
    if (!url) return;
    QRCode.toDataURL(url, {
      width: 512,
      margin: 1,
      color: { dark: "#012A4A", light: "#FFFFFF" },
    }).then(setDataUrl).catch(() => {});
  }, [url]);

  if (!dataUrl) return null;

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ background: "#fff", padding: 10, borderRadius: 12, boxShadow: "0 0 30px rgba(137,194,217,.35)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUrl} alt={`QR code for ${url}`} width={size} height={size} style={{ display: "block" }} />
      </div>
      <a
        className="btn btn-ghost"
        href={dataUrl}
        download="portfolio-qr.png"
        style={{ fontSize: 12, padding: "9px 18px" }}
      >
        Download QR ↓
      </a>
    </div>
  );
}
