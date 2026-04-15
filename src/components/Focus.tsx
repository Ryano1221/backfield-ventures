"use client";

export default function Focus() {
  const areas = [
    {
      category: "Consumer",
      tagline: "Brands people love",
      description:
        "We back founders redefining how people eat, move, belong, and spend. From DTC brands with loyal followings to platforms changing everyday behavior — if it resonates with the modern consumer, we want to be in it.",
      examples: [
        "Direct-to-consumer brands",
        "Consumer health & wellness",
        "Community-driven platforms",
        "Modern lifestyle brands",
        "Commerce & marketplaces",
      ],
    },
    {
      category: "Sports",
      tagline: "Where passion meets platform",
      description:
        "Sports is one of the most culturally charged categories in the world — and one of the most underserved by sophisticated capital. We invest across the full ecosystem: fan experience, athlete platforms, sports media, and the infrastructure that powers the modern game.",
      examples: [
        "Fan engagement & experiences",
        "Athlete brands & ventures",
        "Sports technology",
        "Media & streaming",
        "Sports data & analytics",
      ],
    },
    {
      category: "Adjacent",
      tagline: "Conviction without constraint",
      description:
        "We don't draw hard lines. Occasionally we back companies that sit at the intersection of our themes or fall outside them entirely — when the founder is exceptional and the opportunity is clear.",
      examples: [
        "Emerging creator economy",
        "Entertainment & media",
        "Luxury & premium goods",
        "Adjacent infrastructure",
      ],
    },
  ];

  return (
    <section
      id="focus"
      style={{
        padding: "140px 32px",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      {/* Section header */}
      <div style={{ marginBottom: "80px" }}>
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
            Investment Focus
          </span>
        </div>
        <h2
          style={{
            fontFamily: "var(--font-cormorant), Georgia, serif",
            fontSize: "clamp(38px, 5vw, 58px)",
            fontWeight: 400,
            lineHeight: 1.1,
            color: "var(--color-text-primary)",
            maxWidth: "560px",
          }}
        >
          Where we{" "}
          <em style={{ fontStyle: "italic", color: "var(--color-gold-light)" }}>
            concentrate
          </em>
        </h2>
      </div>

      {/* Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "1px",
          background: "var(--color-border)",
          border: "1px solid var(--color-border)",
          borderRadius: "4px",
          overflow: "hidden",
        }}
      >
        {areas.map((area) => (
          <div
            key={area.category}
            style={{
              background: "var(--color-surface)",
              padding: "48px 40px",
              display: "flex",
              flexDirection: "column",
              gap: "0",
              transition: "background 0.2s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "var(--color-surface-2)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "var(--color-surface)";
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
              {area.category}
            </span>
            <h3
              style={{
                fontFamily: "var(--font-cormorant), Georgia, serif",
                fontSize: "28px",
                fontWeight: 400,
                color: "var(--color-text-primary)",
                marginBottom: "20px",
                lineHeight: 1.2,
              }}
            >
              {area.tagline}
            </h3>
            <p
              style={{
                fontSize: "14px",
                lineHeight: 1.75,
                color: "var(--color-text-secondary)",
                marginBottom: "32px",
                flex: 1,
              }}
            >
              {area.description}
            </p>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                borderTop: "1px solid var(--color-border)",
                paddingTop: "28px",
              }}
            >
              {area.examples.map((ex) => (
                <li
                  key={ex}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    fontSize: "13px",
                    color: "var(--color-text-muted)",
                  }}
                >
                  <span
                    style={{
                      width: "4px",
                      height: "4px",
                      borderRadius: "50%",
                      background: "var(--color-gold)",
                      opacity: 0.6,
                      flexShrink: 0,
                    }}
                  />
                  {ex}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
