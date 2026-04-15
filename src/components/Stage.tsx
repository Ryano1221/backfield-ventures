export default function Stage() {
  const stages = [
    { label: "Pre-Seed", note: "Selectively", width: "35%", active: false },
    { label: "Seed", note: "Primary Focus", width: "100%", active: true },
    { label: "Series A", note: "Primary Focus", width: "80%", active: true },
    { label: "Series B+", note: "Selectively", width: "28%", active: false },
  ];

  return (
    <section
      style={{
        borderTop: "1px solid var(--color-border)",
        borderBottom: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        padding: "120px 32px",
      }}
    >
      <div
        className="stage-grid"
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "80px",
          alignItems: "center",
        }}
      >
        {/* Left: copy */}
        <div>
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
              Stage & Check Size
            </span>
          </div>

          <h2
            style={{
              fontFamily: "var(--font-cormorant), Georgia, serif",
              fontSize: "clamp(36px, 4.5vw, 54px)",
              fontWeight: 400,
              lineHeight: 1.1,
              color: "var(--color-text-primary)",
              marginBottom: "28px",
            }}
          >
            Seed to Series A.
            <br />
            <em
              style={{
                fontStyle: "italic",
                color: "var(--color-text-secondary)",
                fontWeight: 300,
              }}
            >
              Earlier when it&apos;s right.
            </em>
          </h2>

          <p
            style={{
              fontSize: "15px",
              lineHeight: 1.8,
              color: "var(--color-text-secondary)",
              maxWidth: "440px",
            }}
          >
            Our primary focus is seed and Series A — the stages where
            foundational conviction and the right capital partner matter most.
            We&apos;ll go earlier for the right founder, and we&apos;ll lean in at later
            stages when we have meaningful insight into the company.
          </p>
        </div>

        {/* Right: stage indicators */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {stages.map((stage) => (
            <div
              key={stage.label}
              style={{
                padding: "18px 24px",
                borderRadius: "3px",
                background: stage.active
                  ? "rgba(200,168,107,0.06)"
                  : "transparent",
                border: stage.active
                  ? "1px solid rgba(200,168,107,0.15)"
                  : "1px solid transparent",
                display: "flex",
                alignItems: "center",
                gap: "20px",
              }}
            >
              {/* Bar */}
              <div
                style={{
                  flex: 1,
                  height: "2px",
                  background: "rgba(255,255,255,0.08)",
                  borderRadius: "2px",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: stage.width,
                    background: stage.active
                      ? "var(--color-gold)"
                      : "rgba(255,255,255,0.18)",
                    borderRadius: "2px",
                  }}
                />
              </div>
              {/* Labels */}
              <div
                style={{
                  minWidth: "180px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "16px",
                }}
              >
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: stage.active ? 500 : 400,
                    color: stage.active
                      ? "var(--color-text-primary)"
                      : "var(--color-text-muted)",
                  }}
                >
                  {stage.label}
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    letterSpacing: "0.06em",
                    color: stage.active
                      ? "var(--color-gold)"
                      : "var(--color-text-muted)",
                    opacity: stage.active ? 0.9 : 0.5,
                    whiteSpace: "nowrap",
                  }}
                >
                  {stage.note}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .stage-grid {
            grid-template-columns: 1fr !important;
            gap: 48px !important;
          }
        }
      `}</style>
    </section>
  );
}
