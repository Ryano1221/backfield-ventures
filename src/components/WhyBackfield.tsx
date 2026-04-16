"use client";

export default function WhyBackfield() {
  const pillars = [
    {
      number: "01",
      title: "Network That Opens Doors",
      body: "We've spent years building relationships with operators, executives, and decision-makers who matter in consumer and sports. Our portfolio companies don't just get capital — they get access.",
    },
    {
      number: "02",
      title: "Commercial Instincts",
      body: "We understand how consumer businesses actually grow — not in theory, but in practice. We've lived in these ecosystems long enough to spot the signals that matter and ignore the noise.",
    },
    {
      number: "03",
      title: "Strategic Partners",
      body: "We roll up our sleeves. Whether it's closing a partnership, sharpening a go-to-market, or making a critical introduction at the right moment — we're available when it counts.",
    },
    {
      number: "04",
      title: "Sports Ecosystem Depth",
      body: "Sports is more than a category for us. We have relationships across leagues, teams, media companies, athletes, and brands that give our portfolio companies a meaningful edge.",
    },
    {
      number: "05",
      title: "Long-Term Orientation",
      body: "We invest with conviction and hold with patience. We're not optimizing for a quick flip — we're building lasting relationships with founders we believe in.",
    },
    {
      number: "06",
      title: "Pattern Recognition",
      body: "We've seen what works and what fails in consumer and sports. That experience informs every decision — from diligence to how we support companies post-investment.",
    },
  ];

  return (
    <section
      id="why"
      style={{
        padding: "48px 40px",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div
        className="two-col-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "60px",
          alignItems: "end",
          marginBottom: "64px",
        }}
      >
        <div>
          <div className="eyebrow">Why Backfield</div>
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
            What we bring{" "}
            <span style={{ color: "var(--color-blue)" }}>beyond capital</span>
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
          Capital is table stakes. The most valuable thing we offer is
          the network, judgment, and relentless follow-through that helps
          founders navigate what comes after the term sheet.
        </p>
      </div>

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "1px",
          background: "var(--color-border)",
          border: "1px solid var(--color-border)",
          borderRadius: "6px",
          overflow: "hidden",
        }}
      >
        {pillars.map((pillar, i) => (
          <div
            key={pillar.number}
            style={{
              background: "var(--color-surface)",
              padding: "40px 36px",
              transition: "background 0.2s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--color-blue-faint)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--color-surface)";
            }}
          >
            {/* Number + red accent */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <span
                style={{
                  fontFamily: "var(--font-montserrat), system-ui, sans-serif",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: "var(--color-blue)",
                }}
              >
                {pillar.number}
              </span>
              {i < 2 && (
                <span
                  style={{
                    display: "block",
                    width: "20px",
                    height: "2px",
                    background: "var(--color-red)",
                    borderRadius: "1px",
                  }}
                />
              )}
            </div>
            <h3
              style={{
                fontFamily: "var(--font-montserrat), system-ui, sans-serif",
                fontSize: "16px",
                fontWeight: 700,
                lineHeight: 1.35,
                color: "var(--color-text)",
                marginBottom: "14px",
                letterSpacing: "-0.005em",
              }}
            >
              {pillar.title}
            </h3>
            <p
              style={{
                fontSize: "13.5px",
                lineHeight: 1.75,
                color: "var(--color-text-secondary)",
              }}
            >
              {pillar.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
