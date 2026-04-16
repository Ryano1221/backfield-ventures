const items = [
  "CONSUMER BRANDS",
  "SPORTS TECHNOLOGY",
  "ATHLETE VENTURES",
  "FAN ENGAGEMENT",
  "SEED & SERIES A",
  "MEDIA & STREAMING",
  "WELLNESS BRANDS",
  "SPORTS DATA",
];

export default function Ticker() {
  const doubled = [...items, ...items];

  return (
    <div className="ticker" aria-label="Scrolling investment focus areas">
      <div className="ticker__track">
        {doubled.map((item, i) => (
          <span key={i} className="ticker__item">
            {item} <span className="ticker__dot">&#10022;</span>
          </span>
        ))}
      </div>
    </div>
  );
}
