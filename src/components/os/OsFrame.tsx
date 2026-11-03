import type { ReactNode } from "react";
import type { FinderItem } from "@/lib/os/finder";
import type { OsSection } from "@/lib/os/nav";
import { osHrefs } from "@/lib/os/nav";
import type { OsAction } from "@/lib/os/types";
import { OsShell } from "./OsShell";

const LINKS: { id: OsSection; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "crm", label: "CRM" },
  { id: "pipeline", label: "Pipeline" },
  { id: "bots", label: "Bots" },
  { id: "activity", label: "Activity" },
];

export function OsFrame({
  active,
  hrefs,
  loginPath,
  updated,
  updatedDetail,
  actions,
  finder,
  children,
}: {
  active: OsSection;
  hrefs: ReturnType<typeof osHrefs>;
  loginPath: string;
  updated: string;
  updatedDetail: string;
  actions: OsAction[];
  finder: FinderItem[];
  children: ReactNode;
}) {
  return (
    <OsShell
      active={active}
      links={LINKS.map((link) => ({ ...link, href: hrefs[link.id] }))}
      loginPath={loginPath}
      updated={updated}
      updatedDetail={updatedDetail}
      initialActions={actions}
      finder={finder}
    >
      {children}
    </OsShell>
  );
}
