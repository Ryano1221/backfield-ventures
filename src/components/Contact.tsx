export default function Contact() {
  return (
    <section className="contact section" id="contact">
      <div className="container">
        <div className="section-label reveal-bottom">
          <span className="section-num">04 &mdash; GET IN TOUCH</span>
        </div>
        <h2 className="section-heading reveal-bottom">
          Let&apos;s talk about<br />your play.
        </h2>

        <div className="contact__cards">

          <a
            href="mailto:hello@backfieldventures.com?subject=Pitch Deck"
            className="contact__card reveal-bottom"
            aria-label="Send your deck to Backfield Ventures"
          >
            <div className="contact__card-icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M3 8l9 6 9-6M3 6h18v12H3V6z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="contact__card-label">FOUNDERS</span>
            <h3 className="contact__card-title">Send Your Deck</h3>
            <span className="contact__card-arrow">&rarr;</span>
          </a>

          <a
            href="mailto:hello@backfieldventures.com?subject=LP Inquiry"
            className="contact__card reveal-bottom"
            aria-label="Contact Backfield Ventures about LP opportunities"
          >
            <div className="contact__card-icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="7" width="20" height="14" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <span className="contact__card-label">INVESTORS</span>
            <h3 className="contact__card-title">LP Inquiries</h3>
            <span className="contact__card-arrow">&rarr;</span>
          </a>

          <a
            href="mailto:hello@backfieldventures.com?subject=Partnership"
            className="contact__card reveal-bottom"
            aria-label="Partner with Backfield Ventures"
          >
            <div className="contact__card-icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M7 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="contact__card-label">OPERATORS</span>
            <h3 className="contact__card-title">Partner With Us</h3>
            <span className="contact__card-arrow">&rarr;</span>
          </a>

        </div>

        <div className="contact__email reveal-bottom">
          <a
            href="mailto:hello@backfieldventures.com"
            className="contact__email-link"
            aria-label="Email Backfield Ventures at hello@backfieldventures.com"
          >
            hello@backfieldventures.com
          </a>
        </div>

        <div className="contact__social reveal-bottom">
          <a
            href="https://linkedin.com/company/backfield-ventures"
            target="_blank"
            rel="noopener noreferrer"
            className="contact__social-link"
          >
            LINKEDIN &nearr;
          </a>
        </div>
      </div>
    </section>
  );
}
