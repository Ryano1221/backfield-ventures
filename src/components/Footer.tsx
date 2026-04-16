import Image from "next/image";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">

        <div className="footer__brand">
          <a href="#" className="footer__logo-link" aria-label="Backfield Ventures">
            <Image
              src="/logo-text.png"
              alt="Backfield Ventures"
              width={1462}
              height={317}
              className="footer__logo-img"
            />
          </a>
          <p className="footer__sub">Behind the next generation.</p>
        </div>

        <nav className="footer__nav" aria-label="Footer navigation">
          <a href="#focus" className="footer__nav-link">FOCUS</a>
          <a href="#why" className="footer__nav-link">WHY US</a>
          <a href="#philosophy" className="footer__nav-link">PHILOSOPHY</a>
          <a href="#contact" className="footer__nav-link">CONTACT</a>
          <a
            href="https://linkedin.com/company/backfield-ventures"
            target="_blank"
            rel="noopener noreferrer"
            className="footer__nav-link"
          >
            LINKEDIN ↗
          </a>
        </nav>

        <div className="footer__right">
          <p className="footer__copy">&copy; 2026 Backfield Ventures. All rights reserved.</p>
        </div>

      </div>
    </footer>
  );
}
