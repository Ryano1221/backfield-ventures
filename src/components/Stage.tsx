export default function Stage() {
  const rows = [
    { name: "PRE-SEED",  tag: "SELECTIVE",     tagClass: "stage__tag--selective", note: "Exceptional founders only",           primary: false, fill: 20  },
    { name: "SEED",      tag: "PRIMARY FOCUS", tagClass: "stage__tag--primary",   note: "Core investment stage",               primary: true,  fill: 100 },
    { name: "SERIES A",  tag: "PRIMARY FOCUS", tagClass: "stage__tag--primary",   note: "Core investment stage",               primary: true,  fill: 100 },
    { name: "SERIES B+", tag: "SELECTIVE",     tagClass: "stage__tag--selective", note: "Adjacent & breakout opportunities",   primary: false, fill: 30  },
  ];

  return (
    <section className="stage">
      <div className="container">
        <div className="stage__table reveal-bottom">
          <div className="stage__row stage__row--header">
            <span>STAGE</span>
            <span>APPROACH</span>
            <span>NOTES</span>
          </div>
          {rows.map((row) => (
            <div
              key={row.name}
              className={`stage__row${row.primary ? " stage__row--primary" : ""}`}
              data-fill={row.fill}
            >
              <span className="stage__name">{row.name}</span>
              <span className={`stage__tag ${row.tagClass}`}>{row.tag}</span>
              <span className="stage__note">{row.note}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
