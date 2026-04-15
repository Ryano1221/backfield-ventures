"use client";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        borderTop: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        padding: "48px 32px",
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
          gap: "24px",
        }}
      >
        {/* Logo / name */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span
            style={{
              fontFamily: "var(--font-cormorant), Georgia, serif",
              fontSize: "17px",
              fontWeight: 500,
              color: "var(--color-text-primary)",
              letterSpacing: "0.01em",
            }}
          >
            Backfield Ventures
          </span>
          <span
            style={{
              fontSize: "12px",
              color: "var(--color-text-muted)",
            }}
          >
            Consumer &amp; Sports
          </span>
        </div>

        {/* Center: tagline */}
        <p
          style={{
            fontSize: "12px",
            color: "var(--color-text-muted)",
            letterSpacing: "0.03em",
            textAlign: "center",
          }}
        >
          Behind the next generation of consumer and sports companies.
        </p>

        {/* Right: links */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "28px",
          }}
        >
          <a
            href="mailto:hello@backfieldventures.com"
            style={{
              fontSize: "12px",
              color: "var(--color-text-muted)",
              textDecoration: "none",
              letterSpacing: "0.05em",
              transition: "color 0.2s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color =
                "var(--color-text-secondary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color =
                "var(--color-text-muted)";
            }}
          >
            Email
          </a>
          <span
            style={{
              fontSize: "12px",
              color: "var(--color-text-muted)",
            }}
          >
            © {year}
          </span>
        </div>
      </div>
    </footer>
  );
}
