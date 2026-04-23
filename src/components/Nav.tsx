"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
        <a href="#" className="nav__brand" aria-label="Backfield Ventures Home">
          <Image
            src="/logo-text.png"
            alt="Backfield Ventures"
            width={1462}
            height={317}
            className="nav__logo-img"
            priority
          />
        </a>

        <ul className="nav__links">
          <li><a href="#focus" className="nav__link">THESIS</a></li>
          <li><a href="#why" className="nav__link">WHY</a></li>
          <li><a href="#philosophy" className="nav__link">PHILOSOPHY</a></li>
          <li><a href="#contact" className="nav__link">CONTACT</a></li>
        </ul>

        <div className="nav__cta-group">
          <button className="bfv-btn" onClick={() => (window as any).bfvOpen('pitch')}>
            PITCH US <span className="bfv-arrow">→</span>
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
        <a href="#focus" className="nav__mobile-link" onClick={closeMenu}>THESIS</a>
        <a href="#why" className="nav__mobile-link" onClick={closeMenu}>WHY</a>
        <a href="#philosophy" className="nav__mobile-link" onClick={closeMenu}>PHILOSOPHY</a>
        <a href="#contact" className="nav__mobile-link" onClick={closeMenu}>CONTACT</a>
        <button className="bfv-btn" onClick={() => { closeMenu(); (window as any).bfvOpen('pitch'); }}>
          PITCH US <span className="bfv-arrow">→</span>
        </button>
        <button className="bfv-btn" onClick={() => { closeMenu(); (window as any).bfvOpen('invest'); }}>
          INVEST <span className="bfv-arrow">→</span>
        </button>
      </div>
    </nav>
  );
}
