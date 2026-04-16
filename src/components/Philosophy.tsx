export default function Philosophy() {
  const principles = [
    {
      title: "We Don\u2019t Shortcut The Work",
      body: "Every investment is fully underwritten before we commit.",
    },
    {
      title: "We Don\u2019t Rush Outcomes",
      body: "Time is required for great businesses to play out.",
    },
    {
      title: "We Stay Involved",
      body: "We continue building conviction post-investment.",
    },
    {
      title: "We Connect Builders",
      body: "We connect the right people to move businesses forward.",
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
