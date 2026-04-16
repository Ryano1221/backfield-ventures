export default function Philosophy() {
  const principles = [
    {
      title: "Selective by design",
      body: "We say no often so we can say yes completely. Every founder gets real attention, not a check and a wave.",
    },
    {
      title: "Relationship-driven",
      body: "People first, markets second. The best deals come from relationships, not deal flow.",
    },
    {
      title: "High conviction",
      body: "We back the company we believe in most. One yes carries the full weight of our network.",
    },
    {
      title: "Long-term partners",
      body: "We're not looking for exits. We're looking for companies that redefine categories.",
    },
  ];

  return (
    <section className="section" id="philosophy">
      <div className="container">
        <div className="section-label reveal-bottom">
          <span className="section-num">03 &mdash; HOW WE OPERATE</span>
        </div>
        <h2 className="section-heading reveal-bottom">
          How we show up<br />for founders.
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
