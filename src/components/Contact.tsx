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
        "Interested in what we're building at Backfield? We're selective about the relationships we build on the LP side — reach out if you'd like to learn more.",
      cta: "Get in touch",
      href: "mailto:hello@backfieldventures.com?subject=LP Inquiry",
    },
    {
      type: "Partners & Operators",
      description:
        "If you work in consumer or sports and want to explore how we might collaborate — whether for our portfolio companies or in a broader capacity — let's talk.",
      cta: "Start a conversation",
      href: "mailto:hello@backfieldventures.com?subject=Partnership",
    },
  ];

  return (
    <section
      id="contact"
      style={{
        padding: "140px 32px",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "80px", textAlign: "center" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "14px",
            marginBottom: "20px",
          }}
        >
          <span
            style={{
              display: "block",
              width: "28px",
              height: "1px",
              background: "var(--color-gold)",
            }}
          />
          <span
            style={{
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--color-gold)",
            }}
          >
            Get in Touch
          </span>
          <span
            style={{
              display: "block",
              width: "28px",
              height: "1px",
              background: "var(--color-gold)",
            }}
          />
        </div>

        <h2
          style={{
            fontFamily: "var(--font-cormorant), Georgia, serif",
            fontSize: "clamp(40px, 6vw, 68px)",
            fontWeight: 400,
            lineHeight: 1.05,
            color: "var(--color-text-primary)",
            marginBottom: "20px",
          }}
        >
          The right conversation
          <br />
          <em
            style={{
              fontStyle: "italic",
              color: "var(--color-gold-light)",
              fontWeight: 300,
            }}
          >
            starts here.
          </em>
        </h2>

        <p
          style={{
            fontSize: "15px",
            lineHeight: 1.8,
            color: "var(--color-text-secondary)",
            maxWidth: "480px",
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
          gap: "24px",
          marginBottom: "80px",
        }}
      >
        {audiences.map((aud) => (
          <div
            key={aud.type}
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "4px",
              padding: "40px 36px",
              display: "flex",
              flexDirection: "column",
              gap: "0",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 500,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--color-gold)",
                marginBottom: "16px",
              }}
            >
              {aud.type}
            </span>
            <p
              style={{
                fontSize: "14px",
                lineHeight: 1.75,
                color: "var(--color-text-secondary)",
                flex: 1,
                marginBottom: "32px",
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
                fontSize: "12px",
                fontWeight: 500,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--color-text-primary)",
                textDecoration: "none",
                transition: "color 0.2s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color =
                  "var(--color-gold)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color =
                  "var(--color-text-primary)";
              }}
            >
              {aud.cta}
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M2.5 7h9M7.5 3l4 4-4 4" />
              </svg>
            </a>
          </div>
        ))}
      </div>

      {/* Simple email CTA */}
      <div
        style={{
          textAlign: "center",
          padding: "60px 40px",
          border: "1px solid var(--color-border)",
          borderRadius: "4px",
          background: "rgba(200,168,107,0.03)",
        }}
      >
        <p
          style={{
            fontSize: "13px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--color-text-muted)",
            marginBottom: "12px",
          }}
        >
          Or reach us directly
        </p>
        <a
          href="mailto:hello@backfieldventures.com"
          style={{
            fontFamily: "var(--font-cormorant), Georgia, serif",
            fontSize: "clamp(22px, 3vw, 32px)",
            fontWeight: 400,
            color: "var(--color-text-primary)",
            textDecoration: "none",
            letterSpacing: "-0.01em",
            transition: "color 0.2s ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--color-gold)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color =
              "var(--color-text-primary)";
          }}
        >
          hello@backfieldventures.com
        </a>
      </div>
    </section>
  );
}
