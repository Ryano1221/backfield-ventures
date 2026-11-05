"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { emailHrefs, emailNav, emailSection, type EmailSection } from "@/lib/email/nav";
import { AskBox } from "@/components/os/night/AskBox";

const GROUPS = ["Email", "Lists", "System"] as const;

function NavLinks({
  items,
  active,
}: {
  items: { id: EmailSection; label: string; href: string }[];
  active: EmailSection;
}) {
  return (
    <>
      {items.map((item) => (
        <a key={item.id} href={item.href} className={active === item.id ? "on" : ""} aria-current={active === item.id ? "page" : undefined}>
          {item.label}
        </a>
      ))}
    </>
  );
}

export function EmailShell({ onOs, embedded = false, children }: { onOs: boolean; embedded?: boolean; children: ReactNode }) {
  const pathname = usePathname() || "/os/email";
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const open = menuPath === pathname;
  const hrefs = emailHrefs(onOs);
  const nav = emailNav(onOs);
  const active = emailSection(pathname);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuPath(null);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Inside the OS frame the OS rail is the only rail. Email gets one row of
  // section tabs instead of its own sidebar, menu bar, and drawer.
  if (embedded) {
    return (
      <div className="email is-embedded">
        <nav className="email-tabs" aria-label="Email sections">
          {GROUPS.map((group) => (
            <NavLinks key={group} items={nav.filter((item) => item.group === group)} active={active} />
          ))}
        </nav>
        <div className="email-body">{children}</div>
      </div>
    );
  }

  return (
    <div className="email">
      <header className="mbar">
        <img src="/brand/logo-cream.png" alt="Backfield Ventures" />
        <button type="button" className="menu-btn" aria-label="Open menu" aria-expanded={open} onClick={() => setMenuPath(pathname)}>
          <i className="burger" aria-hidden="true" />
          Menu
        </button>
      </header>
      <aside className="side">
        <img src="/brand/logo-cream.png" alt="Backfield Ventures" />
        <div className="sub lbl">OS · Email</div>
        <nav className="nav" aria-label="Email">
          <NavLinks items={nav.filter((item) => item.group === "Email")} active={active} />
          <div className="grp lbl">Lists</div>
          <NavLinks items={nav.filter((item) => item.group === "Lists")} active={active} />
          <div className="grp lbl">System</div>
          <NavLinks items={nav.filter((item) => item.group === "System")} active={active} />
        </nav>
      </aside>
      <div className="content">
        <div className="crumb lbl">
          <a href={hrefs.today}>← Today</a>
          <span>
            <a href={hrefs.today}>Backfield OS</a> <span className="sep">/</span> Email
          </span>
          <AskBox actions={[]} context={{ page: pathname, about: null, requestedBy: null, botName: null }} />
          <span className="private">Private to Ryan</span>
        </div>
        <main className="main">{children}</main>
      </div>
      {open ? (
        <div className="drawer" role="dialog" aria-modal="true" aria-label="Email menu">
          <header className="mbar">
            <img src="/brand/logo-cream.png" alt="Backfield Ventures" />
            <button type="button" className="menu-btn" aria-label="Close menu" onClick={() => setMenuPath(null)}>
              <i className="x" aria-hidden="true" />
              Close
            </button>
          </header>
          <nav>
            {GROUPS.map((group) => (
              <div key={group}>
                <div className="grp lbl">{group}</div>
                <NavLinks items={nav.filter((item) => item.group === group)} active={active} />
              </div>
            ))}
            <a className="today-link" href={hrefs.today}>
              ← Today
            </a>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
