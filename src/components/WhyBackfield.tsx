"use client";

export default function WhyBackfield() {
  const pillars = [
    {
      number: "01",
      title: "Network That Opens Doors",
      body:
        "We've spent years building relationships with the operators, executives, and decision-makers who matter in consumer and sports. Our portfolio companies don't just get capital — they get access.",
    },
    {
      number: "02",
      title: "Commercial Instincts",
      body:
        "We understand how consumer businesses grow — not just in theory, but in practice. We've lived in these ecosystems long enough to spot the signals that matter and ignore the noise.",
    },
    {
      number: "03",
      title: "Strategic Partners, Not Passive Investors",
      body:
        "We roll up our sleeves. Whether it's helping close a partnership, thinking through a go-to-market, or making a critical introduction at the right moment — we're available when it counts.",
    },
    {
      number: "04",
      title: "Sports Ecosystem Depth",
      body:
        "Sports is more than a category for us. We have relationships across leagues, teams, media companies, athletes, and brands that give our portfolio companies an unfair advantage.",
    },
    {
      number: "05",
      title: "Long-Term Orientation",
      body:
        "We invest with conviction and hold with patience. We're not optimizing for a quick flip — we're building relationships with founders we believe in for the long arc of company-building.",
    },
    {
      number: "06",
      title: "Pattern Recognition",
      body:
        "We've seen what works in consumer and sports, and we've seen what fails. That pattern recognition informs every decision we make — from diligence to how we support companies post-investment.",
    },
  ];

  return (
    <section
      id="why"
      style={{
        padding: "140px 32px",
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
          marginBottom: "80px",
        }}
      >
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
              Why Backfield
            </span>
          </div>
          <h2
            style={{
              fontFamily: "var(--font-cormorant), Georgia, serif",
              fontSize: "clamp(38px, 5vw, 58px)",
              fontWeight: 400,
              lineHeight: 1.1,
              color: "var(--color-text-primary)",
            }}
          >
            What we bring
            <br />
            <em
              style={{
                fontStyle: "italic",
                color: "var(--color-gold-light)",
                fontWeight: 300,
              }}
            >
              beyond capital
            </em>
          </h2>
        </div>
        <p
          style={{
            fontSize: "15px",
            lineHeight: 1.8,
            color: "var(--color-text-secondary)",
            paddingBottom: "8px",
          }}
        >
          Capital is table stakes. The most valuable thing we offer is the
          network, judgment, and relentless support that helps founders
          navigate what comes after the term sheet.
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
          borderRadius: "4px",
          overflow: "hidden",
        }}
      >
        {pillars.map((pillar) => (
          <div
            key={pillar.number}
            style={{
              background: "var(--color-bg)",
              padding: "44px 40px",
              transition: "background 0.2s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "var(--color-surface)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "var(--color-bg)";
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-cormorant), Georgia, serif",
                fontSize: "13px",
                fontWeight: 400,
                letterSpacing: "0.1em",
                color: "var(--color-gold)",
                opacity: 0.7,
                display: "block",
                marginBottom: "20px",
              }}
            >
              {pillar.number}
            </span>
            <h3
              style={{
                fontFamily: "var(--font-cormorant), Georgia, serif",
                fontSize: "22px",
                fontWeight: 500,
                lineHeight: 1.3,
                color: "var(--color-text-primary)",
                marginBottom: "16px",
              }}
            >
              {pillar.title}
            </h3>
            <p
              style={{
                fontSize: "14px",
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
