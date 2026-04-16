"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

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
        borderBottom: scrolled
          ? "1px solid var(--color-border-light)"
          : "1px solid transparent",
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
            style={{ objectFit: "contain", height: "48px", width: "auto" }}
            priority
          />
        </a>

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
                  (e.currentTarget as HTMLElement).style.color =
                    "var(--color-black)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color =
                    "var(--color-text-secondary)";
                }}
              >
                {link.label}
              </a>
            ))}
          </nav>
          <a
            href="#contact"
            className="btn-primary"
            style={{ padding: "10px 22px" }}
          >
            Get in Touch
          </a>
        </div>
      </div>
    </header>
  );
}
