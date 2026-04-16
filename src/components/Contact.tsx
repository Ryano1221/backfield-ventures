"use client";

export default function Contact() {
  const audiences = [
    {
      type: "Founders",
      description:
        "Building something in consumer or sports and looking for a partner who gets it? We'd love to hear from you. Tell us what you're building and why now.",
      cta: "Send us your deck",
      href: "mailto:hello@backfieldventures.com?subject=Founder Intro",
    },
    {
      type: "Investors & LPs",
      description:
        "Interested in what we're building at Backfield? We're selective about LP relationships — reach out if you'd like to learn more about our focus and portfolio.",
      cta: "Get in touch",
      href: "mailto:hello@backfieldventures.com?subject=LP Inquiry",
    },
    {
      type: "Partners & Operators",
      description:
        "Work in consumer or sports and want to explore how we might collaborate — for portfolio companies or in a broader capacity — let's connect.",
      cta: "Start a conversation",
      href: "mailto:hello@backfieldventures.com?subject=Partnership",
    },
  ];

  return (
    <section
      id="contact"
      style={{
        background: "var(--color-blue)",
        padding: "48px 40px",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "64px", textAlign: "center" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              marginBottom: "24px",
            }}
          >
            <span
              style={{
                display: "block",
                width: "24px",
                height: "2px",
                background: "rgba(255,255,255,0.4)",
                borderRadius: "1px",
              }}
            />
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.65)",
              }}
            >
              Get in Touch
            </span>
            <span
              style={{
                display: "block",
                width: "24px",
                height: "2px",
                background: "rgba(255,255,255,0.4)",
                borderRadius: "1px",
              }}
            />
          </div>

          <h2
            style={{
              fontFamily: "var(--font-montserrat), system-ui, sans-serif",
              fontSize: "clamp(36px, 5.5vw, 62px)",
              fontWeight: 900,
              lineHeight: 1.0,
              letterSpacing: "-0.025em",
              textTransform: "uppercase",
              color: "#fff",
              marginBottom: "8px",
            }}
          >
            The right conversation
          </h2>
          <h2
            style={{
              fontFamily: "var(--font-montserrat), system-ui, sans-serif",
              fontSize: "clamp(36px, 5.5vw, 62px)",
              fontWeight: 900,
              lineHeight: 1.0,
              letterSpacing: "-0.025em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.35)",
              marginBottom: "28px",
            }}
          >
            starts here.
          </h2>

          <p
            style={{
              fontSize: "14px",
              lineHeight: 1.8,
              color: "rgba(255,255,255,0.65)",
              maxWidth: "440px",
              margin: "0 auto",
            }}
          >
            We respond to every serious inquiry. No decks go unread, no
            introductions go unacknowledged.
          </p>
        </div>

        {/* Audience cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "16px",
            marginBottom: "48px",
          }}
        >
          {audiences.map((aud) => (
            <div
              key={aud.type}
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "6px",
                padding: "36px 32px",
                display: "flex",
                flexDirection: "column",
                backdropFilter: "blur(4px)",
              }}
            >
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.55)",
                  marginBottom: "14px",
                  display: "block",
                }}
              >
                {aud.type}
              </span>
              <p
                style={{
                  fontSize: "13.5px",
                  lineHeight: 1.75,
                  color: "rgba(255,255,255,0.75)",
                  flex: 1,
                  marginBottom: "28px",
                }}
              >
                {aud.description}
              </p>
              <a
                href={aud.href}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#fff",
                  textDecoration: "none",
                  transition: "opacity 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.opacity = "0.7";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.opacity = "1";
                }}
              >
                {aud.cta}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2.5 7h9M7.5 3l4 4-4 4" />
                </svg>
              </a>
            </div>
          ))}
        </div>

        {/* Direct email */}
        <div
          style={{
            textAlign: "center",
            padding: "48px 40px",
            borderRadius: "6px",
            border: "1px solid rgba(255,255,255,0.15)",
            background: "rgba(255,255,255,0.05)",
          }}
        >
          <p
            style={{
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.45)",
              marginBottom: "12px",
            }}
          >
            Or reach us directly
          </p>
          <a
            href="mailto:hello@backfieldventures.com"
            style={{
              fontFamily: "var(--font-montserrat), system-ui, sans-serif",
              fontSize: "clamp(18px, 2.5vw, 28px)",
              fontWeight: 700,
              color: "#fff",
              textDecoration: "none",
              letterSpacing: "-0.01em",
              transition: "opacity 0.2s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = "0.7";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = "1";
            }}
          >
            hello@backfieldventures.com
          </a>
        </div>
      </div>
    </section>
  );
}
