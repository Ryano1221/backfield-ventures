export default function Philosophy() {
  const principles = [
    {
      title: "Selective by design",
      body: "We invest in a small number of companies each year. That concentration is intentional — it means every founder in our portfolio gets real attention, not a quarterly check-in.",
    },
    {
      title: "Relationship-driven",
      body: "The best opportunities rarely come from cold decks. We spend time with founders long before term sheets are on the table, and stay connected long after the round closes.",
    },
    {
      title: "High conviction",
      body: "We don't hedge. When we invest, we believe — in the category, the team, and the timing. That conviction shows up in how we support companies, not just in the check we write.",
    },
    {
      title: "Long-term partners",
      body: "We want to be the firm that founders still call five years from now — for advice, introductions, and the hard conversations that don't fit neatly into a board meeting.",
    },
  ];

  return (
    <section
      style={{
        background: "var(--color-surface)",
        borderTop: "1px solid var(--color-border-light)",
        padding: "120px 40px",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <div
          className="two-col-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "80px",
            alignItems: "end",
            marginBottom: "72px",
          }}
        >
          <div>
            <div className="eyebrow">Philosophy</div>
            <h2
              style={{
                fontFamily: "var(--font-montserrat), system-ui, sans-serif",
                fontSize: "clamp(30px, 4vw, 46px)",
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                textTransform: "uppercase",
                color: "var(--color-text)",
                margin: 0,
              }}
            >
              How we{" "}
              <span style={{ color: "var(--color-blue)" }}>
                approach the work
              </span>
            </h2>
          </div>
          <p
            style={{
              fontSize: "14px",
              lineHeight: 1.8,
              color: "var(--color-text-secondary)",
              margin: 0,
            }}
          >
            Venture is a relationship business. We try to act like it —
            with honesty, consistency, and a long view. The way we treat
            founders in moments that don&apos;t benefit us directly is the
            best signal of who we are.
          </p>
        </div>

        {/* Principles */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "32px",
          }}
        >
          {principles.map((p, i) => (
            <div
              key={p.title}
              style={{
                padding: "36px 32px",
                background: "var(--color-bg)",
                border: "1px solid var(--color-border)",
                borderRadius: "6px",
                borderTop: "2px solid var(--color-black)",
              }}
            >
              <div
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "var(--color-text-muted)",
                  marginBottom: "16px",
                }}
              >
                0{i + 1}
              </div>
              <h3
                style={{
                  fontFamily: "var(--font-montserrat), system-ui, sans-serif",
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "var(--color-text)",
                  marginBottom: "12px",
                  lineHeight: 1.3,
                  letterSpacing: "-0.005em",
                }}
              >
                {p.title}
              </h3>
              <p
                style={{
                  fontSize: "13.5px",
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
