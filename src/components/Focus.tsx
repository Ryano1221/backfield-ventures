"use client";

export default function Focus() {
  const areas = [
    {
      category: "Consumer",
      label: "Brands people return to",
      description:
        "We back founders redefining how people eat, move, belong, and spend. From DTC brands with loyal communities to platforms reshaping everyday behavior.",
      examples: [
        "Direct-to-consumer brands",
        "Consumer health & wellness",
        "Community-driven platforms",
        "Modern lifestyle brands",
        "Commerce & marketplaces",
      ],
      accent: false,
    },
    {
      category: "Sports",
      label: "Where passion becomes platform",
      description:
        "Sports is one of the most culturally powerful categories in the world — and one of the most underserved by sophisticated capital. We invest across the full ecosystem.",
      examples: [
        "Fan engagement & experiences",
        "Athlete brands & ventures",
        "Sports technology",
        "Media & streaming",
        "Sports data & analytics",
      ],
      accent: true,
    },
  ];

  return (
    <section
      id="focus"
      style={{
        padding: "48px 40px",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "64px" }}>
        <div className="eyebrow">Investment Focus</div>
        <div
          className="two-col-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "60px",
            alignItems: "end",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-montserrat), system-ui, sans-serif",
              fontSize: "clamp(32px, 4vw, 48px)",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              textTransform: "uppercase",
              color: "var(--color-text)",
              margin: 0,
            }}
          >
            Where we{" "}
            <span style={{ color: "var(--color-blue)" }}>concentrate</span>
          </h2>
          <p
            style={{
              fontSize: "14px",
              lineHeight: 1.8,
              color: "var(--color-text-secondary)",
              margin: 0,
            }}
          >
            Two primary categories. One firm with deep relationships in both.
            We don&apos;t try to cover the waterfront — we go deep where we have
            genuine edge.
          </p>
        </div>
      </div>

      {/* Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "20px",
        }}
      >
        {areas.map((area) => (
          <div
            key={area.category}
            style={{
              background: area.accent ? "var(--color-blue)" : "var(--color-surface)",
              border: area.accent
                ? "2px solid var(--color-blue)"
                : "1px solid var(--color-border)",
              borderRadius: "6px",
              padding: "40px 36px",
              display: "flex",
              flexDirection: "column",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
              cursor: "default",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.transform = "translateY(-2px)";
              el.style.boxShadow = "0 8px 32px rgba(0,0,0,0.1)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.transform = "translateY(0)";
              el.style.boxShadow = "none";
            }}
          >
            {/* Category badge */}
            <div style={{ marginBottom: "20px" }}>
              <span
                style={{
                  display: "inline-block",
                  fontSize: "9px",
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: area.accent ? "rgba(255,255,255,0.7)" : "var(--color-blue)",
                  background: area.accent
                    ? "rgba(255,255,255,0.12)"
                    : "var(--color-blue-faint)",
                  padding: "5px 12px",
                  borderRadius: "2px",
                  border: area.accent
                    ? "1px solid rgba(255,255,255,0.2)"
                    : "1px solid var(--color-blue-pale)",
                }}
              >
                {area.category}
              </span>
            </div>

            <h3
              style={{
                fontFamily: "var(--font-montserrat), system-ui, sans-serif",
                fontSize: "20px",
                fontWeight: 700,
                lineHeight: 1.25,
                color: area.accent ? "#fff" : "var(--color-text)",
                marginBottom: "16px",
                letterSpacing: "-0.01em",
              }}
            >
              {area.label}
            </h3>

            <p
              style={{
                fontSize: "13.5px",
                lineHeight: 1.75,
                color: area.accent ? "rgba(255,255,255,0.75)" : "var(--color-text-secondary)",
                marginBottom: "32px",
                flex: 1,
              }}
            >
              {area.description}
            </p>

            {/* Divider */}
            <div
              style={{
                height: "1px",
                background: area.accent ? "rgba(255,255,255,0.15)" : "var(--color-border)",
                marginBottom: "24px",
              }}
            />

            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "9px" }}>
              {area.examples.map((ex) => (
                <li
                  key={ex}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    fontSize: "12.5px",
                    fontWeight: 500,
                    color: area.accent ? "rgba(255,255,255,0.65)" : "var(--color-text-muted)",
                  }}
                >
                  <span
                    style={{
                      width: "5px",
                      height: "5px",
                      borderRadius: "50%",
                      background: area.accent ? "rgba(255,255,255,0.5)" : "var(--color-blue)",
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

      {/* Adjacent — plain text, no card */}
      <div style={{ marginTop: "40px", textAlign: "center" }}>
        <span
          style={{
            display: "block",
            fontSize: "9px",
            fontWeight: 700,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--color-text-muted)",
            marginBottom: "8px",
          }}
        >
          Adjacent
        </span>
        <p
          style={{
            fontSize: "13px",
            lineHeight: 1.75,
            color: "var(--color-text-muted)",
            maxWidth: "560px",
            margin: "0 auto",
          }}
        >
          Occasionally we back companies that sit at the intersection of our themes or fall outside them entirely — when the founder is exceptional and the opportunity is clear.
        </p>
      </div>
    </section>
  );
}
