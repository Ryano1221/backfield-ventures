export default function Philosophy() {
  const principles = [
    {
      title: "Selective by design",
      body:
        "We invest in a small number of companies each year. That concentration is intentional — it means every founder in our portfolio gets real attention, not a quarterly check-in email.",
    },
    {
      title: "Relationship-driven",
      body:
        "The best opportunities rarely come from cold decks. We spend time with founders long before term sheets are on the table, and we stay connected long after the round closes.",
    },
    {
      title: "High conviction",
      body:
        "We don't hedge. When we invest, we believe — in the category, the team, and the timing. That conviction shows up in how we support companies, not just in the check we write.",
    },
    {
      title: "Long-term partners",
      body:
        "We're not interested in three-year outcomes. We want to be the firm that founders still call five years from now — for advice, for introductions, and for the hard conversations.",
    },
  ];

  return (
    <section
      style={{
        borderTop: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        padding: "140px 32px",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
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
            Philosophy
          </span>
        </div>

        <div
          className="two-col-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "80px",
            alignItems: "start",
            marginBottom: "80px",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-cormorant), Georgia, serif",
              fontSize: "clamp(38px, 5vw, 58px)",
              fontWeight: 400,
              lineHeight: 1.1,
              color: "var(--color-text-primary)",
            }}
          >
            How we
            <br />
            <em
              style={{
                fontStyle: "italic",
                color: "var(--color-gold-light)",
                fontWeight: 300,
              }}
            >
              approach the work
            </em>
          </h2>
          <p
            style={{
              fontSize: "15px",
              lineHeight: 1.8,
              color: "var(--color-text-secondary)",
              paddingTop: "8px",
            }}
          >
            Venture is a relationship business. We try to act like it — with
            honesty, consistency, and a long view. The way we treat founders
            in the moments that don&apos;t benefit us directly is the best signal of
            who we are.
          </p>
        </div>

        {/* Principles */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "48px",
          }}
        >
          {principles.map((p, i) => (
            <div key={p.title}>
              {/* Number + line */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "20px",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-cormorant), Georgia, serif",
                    fontSize: "12px",
                    color: "var(--color-gold)",
                    opacity: 0.6,
                  }}
                >
                  0{i + 1}
                </span>
                <span
                  style={{
                    flex: 1,
                    height: "1px",
                    background: "var(--color-border-strong)",
                  }}
                />
              </div>
              <h3
                style={{
                  fontFamily: "var(--font-cormorant), Georgia, serif",
                  fontSize: "22px",
                  fontWeight: 500,
                  color: "var(--color-text-primary)",
                  marginBottom: "14px",
                  lineHeight: 1.3,
                }}
              >
                {p.title}
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  lineHeight: 1.75,
                  color: "var(--color-text-secondary)",
                }}
              >
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
