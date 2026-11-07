/**
 * Shown while an OS page loads. It mirrors the real frame (black sidebar on
 * desktop, top and tab bars on phone) so the page doesn't flash a different
 * layout, then fills the main area with soft placeholders for a title, a row
 * of tiles and a few cards.
 */
export default function OsLoading() {
  return (
    <div className="skel-frame" aria-busy="true" aria-label="Loading">
      <div className="skel-rail" aria-hidden="true">
        <span className="skel-logo" />
        {Array.from({ length: 9 }, (_, i) => (
          <span key={i} className="skel-link" style={{ width: `${55 + ((i * 17) % 35)}%` }} />
        ))}
      </div>
      <div className="skel-col">
        <div className="skel-top" aria-hidden="true" />
        <div className="skel" aria-hidden="true">
          <div className="skel-eyebrow skel-shine" />
          <div className="skel-title skel-shine" />
          <div className="skel-line skel-shine" />
          <div className="skel-tiles">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="skel-tile skel-shine" style={{ animationDelay: `${i * 80}ms` }} />
            ))}
          </div>
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="skel-card skel-shine" style={{ animationDelay: `${120 + i * 100}ms` }}>
              <span className="skel-dot" />
              <span className="skel-row" />
              <span className="skel-row is-short" />
            </div>
          ))}
        </div>
        <div className="skel-tabbar" aria-hidden="true" />
      </div>
    </div>
  );
}
