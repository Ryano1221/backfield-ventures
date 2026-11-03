import type { ReactNode } from "react";
import { OsActions } from "./OsActions";

export function OsFrame({
  active,
  homeHref,
  botsHref,
  loginPath,
  updated,
  updatedDetail,
  children,
}: {
  active: "today" | "bots";
  homeHref: string;
  botsHref: string;
  loginPath: string;
  updated: string;
  updatedDetail: string;
  children: ReactNode;
}) {
  return (
    <>
      <header className="os-bar">
        <div className="os-bar-inner">
          <a className="os-mark" href={homeHref}>
            Backfield
          </a>
          <nav className="os-nav" aria-label="Dashboard">
            <a href={homeHref} aria-current={active === "today" ? "page" : undefined}>
              Today
            </a>
            <a href={botsHref} aria-current={active === "bots" ? "page" : undefined}>
              Bots
            </a>
          </nav>
          <div className="os-bar-meta">
            <p className="os-kicker">Updated</p>
            <strong>{updated}</strong>
            <span>{updatedDetail}</span>
          </div>
          <OsActions loginPath={loginPath} />
        </div>
      </header>
      <main className="os-page">{children}</main>
    </>
  );
}
