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
          <li><a href="#focus" className="nav__link">FOCUS</a></li>
          <li><a href="#why" className="nav__link">WHY</a></li>
          <li><a href="#philosophy" className="nav__link">PHILOSOPHY</a></li>
          <li><a href="#contact" className="nav__link">CONTACT</a></li>
        </ul>

        <a href="mailto:hello@backfieldventures.com" className="nav__cta">
          PITCH US &rarr;
        </a>

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
        <a href="#focus" className="nav__mobile-link" onClick={closeMenu}>FOCUS</a>
        <a href="#why" className="nav__mobile-link" onClick={closeMenu}>WHY</a>
        <a href="#philosophy" className="nav__mobile-link" onClick={closeMenu}>PHILOSOPHY</a>
        <a href="#contact" className="nav__mobile-link" onClick={closeMenu}>CONTACT</a>
        <a
          href="mailto:hello@backfieldventures.com"
          className="nav__mobile-cta"
          onClick={closeMenu}
        >
          PITCH US &rarr;
        </a>
      </div>
    </nav>
  );
}
