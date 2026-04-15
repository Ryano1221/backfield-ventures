"use client";

import { useState, useEffect } from "react";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: scrolled ? "rgba(255,255,255,0.96)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled ? "1px solid var(--color-border-light)" : "1px solid transparent",
        transition: "background 0.3s ease, border-color 0.3s ease",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 40px",
          height: "72px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Mini logo mark — stadium arc */}
          <svg width="28" height="20" viewBox="0 0 28 20" fill="none" aria-hidden="true">
            <path
              d="M2 18 C2 8 26 8 26 18"
              stroke="#1D67BC"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
            <rect x="9" y="10" width="10" height="8" rx="0.5" fill="#1D67BC" opacity="0.15" />
            <rect x="9" y="10" width="10" height="1.5" rx="0" fill="#CC2B33" />
            <line x1="4" y1="15" x2="7" y2="15" stroke="#CC2B33" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="21" y1="15" x2="24" y2="15" stroke="#CC2B33" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <div>
            <span
              style={{
                fontFamily: "var(--font-montserrat), system-ui, sans-serif",
                fontSize: "15px",
                fontWeight: 800,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "var(--color-blue)",
                display: "block",
                lineHeight: 1,
              }}
            >
              Backfield
            </span>
            <span
              style={{
                fontFamily: "var(--font-montserrat), system-ui, sans-serif",
                fontSize: "9px",
                fontWeight: 600,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                color: "var(--color-text-muted)",
                display: "block",
                lineHeight: 1,
                marginTop: "2px",
              }}
            >
              Ventures
            </span>
          </div>
        </div>

        {/* Nav links + CTA */}
        <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
          <nav style={{ display: "flex", gap: "28px" }}>
            {[
              { label: "Focus", href: "#focus" },
              { label: "Approach", href: "#why" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--color-text-secondary)",
                  textDecoration: "none",
                  transition: "color 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "var(--color-blue)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)";
                }}
              >
                {link.label}
              </a>
            ))}
          </nav>
          <a href="#contact" className="btn-primary" style={{ padding: "10px 22px" }}>
            Get in Touch
          </a>
        </div>
      </div>
    </header>
  );
}
