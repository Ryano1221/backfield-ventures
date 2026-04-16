export default function WhyBackfield() {
  const cards = [
    {
      num: "01",
      title: "Selective by design",
      body: "We invest in a small number of companies each year. Every founder gets real attention, not a quarterly check-in.",
    },
    {
      num: "02",
      title: "Relationship-driven",
      body: "The best opportunities rarely come from cold decks. We spend time with founders long before term sheets are on the table.",
    },
    {
      num: "03",
      title: "High conviction",
      body: "We don't hedge. When we invest, we believe — in the category, the team, and the timing.",
    },
    {
      num: "04",
      title: "Long-term partners",
      body: "We want to be the firm founders still call five years from now — for advice, introductions, and the hard conversations.",
    },
    {
      num: "05",
      title: "Honest & consistent",
      body: "The way we treat founders in moments that don't benefit us directly is the best signal of who we are.",
    },
    {
      num: "06",
      title: "Deep in both categories",
      body: "Consumer and sports aren't sidelines for us. They're the only thing we do — and we've built real relationships across both.",
    },
  ];

  return (
    <section className="section" id="why">
      <div className="container">
        <div className="section-label reveal-bottom">
          <span className="section-num">02 &mdash; WHY BACKFIELD</span>
        </div>
        <h2 className="section-heading reveal-bottom">
          What we bring<br />beyond capital.
        </h2>

        <p className="why__intro reveal-bottom">
          Capital is table stakes. The most valuable thing we offer is the
          network, judgment, and relentless follow-through that helps founders
          navigate what comes after the term sheet.
        </p>

        <div className="why__grid">
          {cards.map((card) => (
            <div key={card.num} className="why__card reveal-bottom">
              <span className="why__num">{card.num}</span>
              <h3 className="why__title">{card.title}</h3>
              <p className="why__body">{card.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
