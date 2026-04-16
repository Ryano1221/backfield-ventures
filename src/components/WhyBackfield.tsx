export default function WhyBackfield() {
  const cards = [
    {
      num: "01",
      title: "Disciplined Underwriting",
      body: "We build real conviction through deep underwriting.",
    },
    {
      num: "02",
      title: "Selective By Design",
      body: "We invest in a small number of companies each year. Every founder gets real attention, not a quarterly check-in.",
    },
    {
      num: "03",
      title: "Collaborative Partnership",
      body: "We work alongside founders, not above them.",
    },
    {
      num: "04",
      title: "Built-In Acceleration",
      body: "Operators, athletes, and creators help accelerate growth.",
    },
    {
      num: "05",
      title: "High-Growth Focus",
      body: "We invest in businesses with real paths to scale.",
    },
    {
      num: "06",
      title: "\u201cFilm Study\u201d Mindset",
      body: "We study performance constantly and adapt.",
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
