"use client";

import Image from "next/image";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        background: "var(--color-text)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "40px 40px",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "20px",
        }}
      >
        {/* Logo */}
        <a
          href="/"
          style={{ display: "flex", alignItems: "center", textDecoration: "none", flexShrink: 0 }}
          aria-label="Backfield Ventures — Home"
        >
          <Image
            src="/logo-white.png"
            alt="Backfield Ventures"
            width={100}
            height={44}
            style={{ objectFit: "contain", height: "44px", width: "auto" }}
          />
        </a>

        {/* Center copy */}
        <p
          style={{
            fontSize: "11px",
            color: "rgba(255,255,255,0.3)",
            letterSpacing: "0.03em",
            textAlign: "center",
          }}
        >
          Behind the next generation of consumer and sports companies.
        </p>

        {/* Right */}
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <a
            href="mailto:hello@backfieldventures.com"
            style={{
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.4)",
              textDecoration: "none",
              transition: "color 0.2s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color =
                "rgba(255,255,255,0.8)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color =
                "rgba(255,255,255,0.4)";
            }}
          >
            Email
          </a>
          <span
            style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)" }}
          >
            © {year} Backfield Ventures
          </span>
        </div>
      </div>
    </footer>
  );
}
