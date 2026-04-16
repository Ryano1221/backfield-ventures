"use client";

import Image from "next/image";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        background: "var(--color-bg)",
        borderTop: "1px solid var(--color-border-light)",
        padding: "32px 40px",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          gap: "20px",
        }}
      >
        {/* Left — Logo */}
        <a
          href="/"
          style={{ display: "flex", alignItems: "center", textDecoration: "none" }}
          aria-label="Backfield Ventures — Home"
        >
          <Image
            src="/logo-bw.png"
            alt="Backfield Ventures"
            width={1484}
            height={950}
            style={{ objectFit: "contain", height: "40px", width: "auto" }}
          />
        </a>

        {/* Center — truly centered via grid */}
        <p
          style={{
            fontSize: "11px",
            color: "var(--color-text-muted)",
            letterSpacing: "0.03em",
            textAlign: "center",
            margin: 0,
            whiteSpace: "nowrap",
          }}
        >
          Behind the next generation of consumer and sports companies.
        </p>

        {/* Right */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "18px" }}>
          {/* LinkedIn icon */}
          <a
            href="https://www.linkedin.com/company/backfield-ventures"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Backfield Ventures on LinkedIn"
            style={{
              display: "flex",
              alignItems: "center",
              color: "var(--color-text-muted)",
              opacity: 0.6,
              transition: "opacity 0.2s ease",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.6"; }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect width="24" height="24" rx="4" fill="currentColor"/>
              <path d="M7.75 9.5h-2.5v8h2.5v-8zm-1.25-4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm10.25 4c-1.38 0-2.21.6-2.75 1.2V9.5h-2.5v8h2.5v-4.25c0-1.1.6-1.75 1.65-1.75 1 0 1.6.6 1.6 1.75V17.5h2.5v-4.75c0-2.55-1.4-3.25-3-3.25z" fill="white"/>
            </svg>
          </a>

          {/* Email icon */}
          <a
            href="mailto:hello@backfieldventures.com"
            aria-label="Email Backfield Ventures"
            style={{
              display: "flex",
              alignItems: "center",
              color: "var(--color-text-muted)",
              opacity: 0.6,
              transition: "opacity 0.2s ease",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.6"; }}
          >
            <svg width="22" height="17" viewBox="0 0 24 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="1" y="1" width="22" height="16" rx="2.5" />
              <polyline points="1,1 12,10 23,1" />
            </svg>
          </a>

          <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
            © {year} Backfield Ventures
          </span>
        </div>
      </div>
    </footer>
  );
}
