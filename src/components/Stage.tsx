export default function Stage() {
  const stages = [
    { label: "Pre-Seed", note: "Selectively", pct: 35, active: false },
    { label: "Seed", note: "Primary Focus", pct: 100, active: true },
    { label: "Series A", note: "Primary Focus", pct: 82, active: true },
    { label: "Series B+", note: "Selectively", pct: 28, active: false },
  ];

  return (
    <section
      style={{
        background: "var(--color-blue-faint)",
        borderTop: "1px solid var(--color-border-light)",
        borderBottom: "1px solid var(--color-border-light)",
        padding: "120px 40px",
      }}
    >
      <div
        className="two-col-grid stage-grid"
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "80px",
          alignItems: "center",
        }}
      >
        {/* Left */}
        <div>
          <div className="eyebrow">Stage &amp; Check Size</div>
          <h2
            style={{
              fontFamily: "var(--font-montserrat), system-ui, sans-serif",
              fontSize: "clamp(30px, 4vw, 46px)",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              textTransform: "uppercase",
              color: "var(--color-text)",
              marginBottom: "24px",
            }}
          >
            Seed to{" "}
            <span style={{ color: "var(--color-blue)" }}>Series A.</span>
            <br />
            <span
              style={{
                fontSize: "0.65em",
                fontWeight: 600,
                color: "var(--color-text-muted)",
                textTransform: "uppercase",
              }}
            >
              Earlier when it&apos;s right.
            </span>
          </h2>
          <p
            style={{
              fontSize: "14px",
              lineHeight: 1.8,
              color: "var(--color-text-secondary)",
              maxWidth: "420px",
            }}
          >
            Our primary focus is seed and Series A — the stages where
            foundational conviction and the right partner matter most. We&apos;ll
            go earlier for the right founder, and lean in later when we
            have meaningful insight into the business.
          </p>
        </div>

        {/* Right: stage bars */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {stages.map((stage) => (
            <div
              key={stage.label}
              style={{
                padding: "18px 22px",
                borderRadius: "5px",
                background: stage.active ? "var(--color-surface)" : "transparent",
                border: stage.active
                  ? "1.5px solid var(--color-blue-pale)"
                  : "1.5px solid transparent",
                boxShadow: stage.active
                  ? "0 2px 12px rgba(0,0,0,0.07)"
                  : "none",
                display: "flex",
                alignItems: "center",
                gap: "18px",
              }}
            >
              {/* Progress bar */}
              <div
                style={{
                  flex: 1,
                  height: "3px",
                  background: "var(--color-border)",
                  borderRadius: "2px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${stage.pct}%`,
                    background: stage.active ? "var(--color-blue)" : "var(--color-text-muted)",
                    borderRadius: "2px",
                    opacity: stage.active ? 1 : 0.35,
                  }}
                />
              </div>
              {/* Labels */}
              <div
                style={{
                  minWidth: "200px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: stage.active ? 700 : 500,
                    color: stage.active ? "var(--color-text)" : "var(--color-text-muted)",
                    letterSpacing: "0.01em",
                  }}
                >
                  {stage.label}
                </span>
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 700,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: stage.active ? "var(--color-blue)" : "var(--color-text-muted)",
                    opacity: stage.active ? 1 : 0.5,
                    whiteSpace: "nowrap",
                    background: stage.active ? "var(--color-blue-faint)" : "transparent",
                    padding: stage.active ? "3px 8px" : "0",
                    borderRadius: "2px",
                  }}
                >
                  {stage.note}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
