"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const onHandoff = usePathname() === "/handoff";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav
      id="nav"
      className={`nav${scrolled ? " scrolled" : ""}${menuOpen ? " menu-open" : ""}`}
    >
      <div className="nav__inner">
        <Link href="/" className="nav__brand" aria-label="Backfield Ventures Home">
          <Image
            src="/logo-text.png"
            alt="Backfield Ventures"
            width={1462}
            height={317}
            className="nav__logo-img"
            priority
          />
        </Link>

        <ul className="nav__links">
          <li><Link href="/#focus" className="nav__link">THESIS</Link></li>
          <li><Link href="/#why" className="nav__link">WHY</Link></li>
          <li><Link href="/#philosophy" className="nav__link">PHILOSOPHY</Link></li>
          <li><Link href="/#contact" className="nav__link">CONTACT</Link></li>
          <li>
            <Link href="/handoff" className="nav__link" aria-current={onHandoff ? "page" : undefined}>
              HANDOFF
            </Link>
          </li>
        </ul>

        <div className="nav__cta-group">
          <button className="bfv-btn" onClick={() => (window as any).bfvOpen('pitch')}>
            PITCH <span className="bfv-arrow">→</span>
          </button>
          <button className="bfv-btn" onClick={() => (window as any).bfvOpen('invest')}>
            INVEST <span className="bfv-arrow">→</span>
          </button>
        </div>

        <button
          className="nav__hamburger"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span />
          <span />
        </button>
      </div>

      <div className="nav__mobile-menu">
        <Link href="/#focus" className="nav__mobile-link" onClick={closeMenu}>THESIS</Link>
        <Link href="/#why" className="nav__mobile-link" onClick={closeMenu}>WHY</Link>
        <Link href="/#philosophy" className="nav__mobile-link" onClick={closeMenu}>PHILOSOPHY</Link>
        <Link href="/#contact" className="nav__mobile-link" onClick={closeMenu}>CONTACT</Link>
        <Link href="/handoff" className="nav__mobile-link" onClick={closeMenu} aria-current={onHandoff ? "page" : undefined}>HANDOFF</Link>
        <button className="bfv-btn" onClick={() => { closeMenu(); (window as any).bfvOpen('pitch'); }}>
          PITCH <span className="bfv-arrow">→</span>
        </button>
        <button className="bfv-btn" onClick={() => { closeMenu(); (window as any).bfvOpen('invest'); }}>
          INVEST <span className="bfv-arrow">→</span>
        </button>
      </div>
    </nav>
  );
}
