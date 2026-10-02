"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
  const onHandoff = usePathname() === "/handoff";

  return (
    <footer className="footer">
      <div className="footer__inner">

        <div className="footer__brand">
          <Link href="/" className="footer__logo-link" aria-label="Backfield Ventures">
            <Image
              src="/logo-text.png"
              alt="Backfield Ventures"
              width={1462}
              height={317}
              className="footer__logo-img"
            />
          </Link>
          <p className="footer__sub">Behind the next generation.</p>
        </div>

        <nav className="footer__nav" aria-label="Footer navigation">
          <Link href="/#focus" className="footer__nav-link">FOCUS</Link>
          <Link href="/#why" className="footer__nav-link">WHY US</Link>
          <Link href="/#philosophy" className="footer__nav-link">PHILOSOPHY</Link>
          <Link href="/#contact" className="footer__nav-link">CONTACT</Link>
          <Link
            href="/handoff"
            className="footer__nav-link"
            aria-current={onHandoff ? "page" : undefined}
          >
            The Handoff
          </Link>
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
