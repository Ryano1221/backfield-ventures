"use client";

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
        {/* Wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <svg width="24" height="18" viewBox="0 0 28 20" fill="none" aria-hidden="true">
            <path
              d="M2 18 C2 8 26 8 26 18"
              stroke="#4A90D9"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
            <rect x="9" y="10" width="10" height="7" rx="0.5" fill="#4A90D9" opacity="0.2" />
            <rect x="9" y="10" width="10" height="1.5" rx="0" fill="#CC2B33" />
          </svg>
          <div>
            <span
              style={{
                fontFamily: "var(--font-montserrat), system-ui, sans-serif",
                fontSize: "12px",
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#fff",
                display: "block",
                lineHeight: 1,
              }}
            >
              Backfield Ventures
            </span>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 400,
                color: "rgba(255,255,255,0.35)",
                display: "block",
                marginTop: "3px",
              }}
            >
              Consumer &amp; Sports
            </span>
          </div>
        </div>

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
              (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.8)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)";
            }}
          >
            Email
          </a>
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)" }}>
            © {year} Backfield Ventures
          </span>
        </div>
      </div>
    </footer>
  );
}
