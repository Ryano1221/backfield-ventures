import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";

export const alt =
  "Backfield Ventures — Venture Capital for Consumer & Sports Companies";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Generate on first request so the font fetch works at runtime (Vercel CDN caches the response)
export const dynamic = "force-dynamic";

export default async function Image() {
  // Read B&W stadium logo from local filesystem
  const logoData = await readFile(join(process.cwd(), "public/logo-bw.png"));
  const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;

  // Try to load Space Mono for branded typography
  let fontData: ArrayBuffer | null = null;
  try {
    const css = await fetch(
      "https://fonts.googleapis.com/css2?family=Space+Mono&display=swap",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        },
      }
    ).then((r) => r.text());
    const match = css.match(
      /url\((https:\/\/fonts\.gstatic\.com[^)]+\.woff2)\)/
    );
    if (match) {
      fontData = await fetch(match[1]).then((r) => r.arrayBuffer());
    }
  } catch {
    // Font fetch failed — render with monospace fallback
  }

  type FontInput = {
    name: string;
    data: ArrayBuffer;
    weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
    style?: "normal" | "italic";
  };
  const fonts: FontInput[] = fontData
    ? [{ name: "Space Mono", data: fontData, weight: 400, style: "normal" }]
    : [];

  return new ImageResponse(
    (
      <div
        style={{
          background: "#f5f5f3",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 80px",
          position: "relative",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: "#0a0a0a",
            display: "flex",
          }}
        />

        {/* Logo */}
        <img
          src={logoSrc}
          width={380}
          height={240}
          style={{ objectFit: "contain", marginBottom: "32px" }}
        />

        {/* Divider */}
        <div
          style={{
            width: "56px",
            height: "1px",
            background: "rgba(0,0,0,0.2)",
            marginBottom: "24px",
            display: "flex",
          }}
        />

        {/* Tagline */}
        <div
          style={{
            color: "rgba(0,0,0,0.45)",
            fontSize: "16px",
            fontFamily: fontData ? "Space Mono" : "monospace",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            display: "flex",
          }}
        >
          Venture Capital · Consumer &amp; Sports
        </div>

        {/* URL */}
        <div
          style={{
            position: "absolute",
            bottom: "28px",
            color: "rgba(0,0,0,0.25)",
            fontSize: "13px",
            fontFamily: fontData ? "Space Mono" : "monospace",
            letterSpacing: "0.14em",
            display: "flex",
          }}
        >
          backfieldventures.com
        </div>

        {/* Bottom accent bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: "#0a0a0a",
            display: "flex",
          }}
        />
      </div>
    ),
    { ...size, fonts }
  );
}
