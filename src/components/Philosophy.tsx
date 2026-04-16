export default function Philosophy() {
  const principles = [
    {
      title: "Back the team, not the TAM",
      body: "Market size is theoretical. We invest in people who make markets, not people who fit markets. The TAM doesn't matter until the founder makes it matter.",
    },
    {
      title: "Conviction over consensus",
      body: "The interesting companies look wrong before they look right. We don't need the market to agree with us — we need to be right about the one bet we're making.",
    },
    {
      title: "Time is the edge",
      body: "We're not optimizing for the fastest exit. Patience isn't passive — it's what lets us stay in the game long enough to win it.",
    },
    {
      title: "The relationship is the diligence",
      body: "We know our founders before we need to make a decision. There's no spreadsheet that replaces a year of watching someone operate.",
    },
  ];

  return (
    <section className="section" id="philosophy">
      <div className="container">
        <div className="section-label reveal-bottom">
          <span className="section-num">03 &mdash; HOW WE THINK</span>
        </div>
        <h2 className="section-heading reveal-bottom">
          The beliefs that<br />drive every decision.
        </h2>
      </div>

      <div className="philosophy__list">
        {principles.map((p, i) => (
          <div
            key={p.title}
            className={`philosophy__item philosophy__item--${i % 2 === 0 ? "odd" : "even"} ${i % 2 === 0 ? "reveal-left" : "reveal-right"}`}
          >
            <div className="philosophy__num" aria-hidden="true">
              0{i + 1}
            </div>
            <div className="philosophy__content">
              <h3 className="philosophy__title">{p.title}</h3>
              <p className="philosophy__body">{p.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
