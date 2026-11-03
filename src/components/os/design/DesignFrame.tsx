"use client";

import { useState, type ReactNode } from "react";
import "./design.css";

export function DesignFrame({
  todayHref,
  crmHref,
  botsHref,
  active,
  children,
}: {
  todayHref: string;
  crmHref: string;
  botsHref: string;
  active: "today" | "crm" | "bots";
  children: ReactNode;
}) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  return (
    <div className="dx" data-theme={theme}>
      <header className="dx-bar">
        <a className="dx-logo" href={todayHref}>
          <img src="/brand/backfield-ventures-logo-black.png" alt="Backfield Ventures" />
        </a>
        <nav className="dx-nav" aria-label="Design preview">
          <a href={todayHref} aria-current={active === "today" ? "page" : undefined}>
            Today
          </a>
          <a href={crmHref} aria-current={active === "crm" ? "page" : undefined}>
            CRM
          </a>
          <a href={botsHref} aria-current={active === "bots" ? "page" : undefined}>
            Bots
          </a>
        </nav>
        <button type="button" className="dx-theme" onClick={() => setTheme((current) => (current === "light" ? "dark" : "light"))}>
          {theme === "light" ? "Dark paper" : "Cream paper"}
        </button>
      </header>
      <main className="dx-main">{children}</main>
    </div>
  );
}
