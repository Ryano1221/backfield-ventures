export default function WhyBackfield() {
  const cards = [
    {
      num: "01",
      title: "We lead",
      body: "First or second check, meaningful ownership, board seat or observer role. We don't take passive stakes or ride along.",
    },
    {
      num: "02",
      title: "Two verticals. No exceptions.",
      body: "Consumer and sports exclusively. Not adjacent, not adjacent-adjacent. Deep category expertise built over years of operating in both.",
    },
    {
      num: "03",
      title: "Operator-backed network",
      body: "Our LPs and advisors have built the brands you're building. Our intros aren't cold — they open doors that matter.",
    },
    {
      num: "04",
      title: "Pre-seed to Series A",
      body: "We want to be your first institutional partner, not a late follow-on. We earn the relationship before the round is competitive.",
    },
    {
      num: "05",
      title: "Small portfolio by design",
      body: "We cap the number of companies we back each year. Every founder gets real time from us — not a deck review and a quarterly check-in.",
    },
    {
      num: "06",
      title: "We follow on",
      body: "When you raise again, we're in. We protect our position and double down on what's working. We're not optimizing for our DPI.",
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
