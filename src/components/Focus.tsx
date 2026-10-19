export default function Focus() {
  return (
    <section className="section" id="focus">
      <div className="container">
        <div className="section-label reveal-bottom">
          <span className="section-num">01 · INVESTMENT FOCUS</span>
        </div>
        <h2 className="section-heading reveal-bottom">
          Two categories.<br />Deep conviction in both.
        </h2>

        <div className="focus__columns">

          {/* Consumer */}
          <div className="focus__col reveal-bottom" data-cat="Consumer" tabIndex={0}>
            <span className="focus__watermark" aria-hidden="true">01</span>
            <div className="focus__col-inner">
              <h3 className="focus__col-title">CONSUMER</h3>
              <p className="focus__col-sub"><em>Brands people return to</em></p>
              <ul className="focus__list">
                <li>· Direct-to-consumer brands</li>
                <li>· Consumer health &amp; wellness</li>
                <li>· Community-driven platforms</li>
                <li>· Modern lifestyle brands</li>
                <li>· Commerce &amp; marketplaces</li>
              </ul>
            </div>
          </div>

          {/* Sports */}
          <div className="focus__col reveal-bottom" data-cat="Sports" tabIndex={0}>
            <span className="focus__watermark" aria-hidden="true">02</span>
            <div className="focus__col-inner">
              <h3 className="focus__col-title">SPORTS</h3>
              <p className="focus__col-sub"><em>Where passion becomes platform</em></p>
              <ul className="focus__list">
                <li>· Fan engagement &amp; experiences</li>
                <li>· Athlete brands &amp; ventures</li>
                <li>· Sports technology</li>
                <li>· Media &amp; streaming</li>
                <li>· Sports data &amp; analytics</li>
              </ul>
            </div>
          </div>

        </div>

        <p className="focus__adjacent reveal-bottom">
          <strong>ADJACENT</strong>: We back exceptional founders outside these themes when the opportunity is clear.
        </p>
      </div>
    </section>
  );
}
