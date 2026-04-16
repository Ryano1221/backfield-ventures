"use client";

import Image from "next/image";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        background: "var(--color-bg)",
        borderTop: "1px solid var(--color-border-light)",
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
            src="/logo-bw.png"
            alt="Backfield Ventures"
            width={1484}
            height={950}
            style={{ objectFit: "contain", height: "44px", width: "auto" }}
          />
        </a>

        {/* Center copy */}
        <p
          style={{
            fontSize: "11px",
            color: "var(--color-text-muted)",
            letterSpacing: "0.03em",
            textAlign: "center",
          }}
        >
          Behind the next generation of consumer and sports companies.
        </p>

        {/* Right */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          {/* LinkedIn */}
          <a
            href="https://www.linkedin.com/company/backfield-ventures"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Backfield Ventures on LinkedIn"
            style={{
              display: "flex",
              alignItems: "center",
              opacity: 0.6,
              transition: "opacity 0.2s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = "1";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = "0.6";
            }}
          >
            <Image
              src="/linkedin.png"
              alt="LinkedIn"
              width={1000}
              height={1000}
              style={{ width: "22px", height: "22px", objectFit: "contain" }}
            />
          </a>
          <a
            href="mailto:hello@backfieldventures.com"
            aria-label="Email Backfield Ventures"
            style={{
              display: "flex",
              alignItems: "center",
              opacity: 0.6,
              transition: "opacity 0.2s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = "1";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = "0.6";
            }}
          >
            <svg width="24" height="18" viewBox="0 0 24 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="1" y="1" width="22" height="16" rx="2.5" ry="2.5" />
              <polyline points="1,1 12,10 23,1" />
            </svg>
          </a>
          <span
            style={{ fontSize: "11px", color: "var(--color-text-muted)" }}
          >
            © {year} Backfield Ventures
          </span>
        </div>
      </div>
    </footer>
  );
}
