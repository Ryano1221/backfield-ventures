import { osHrefs } from "@/lib/os/nav";

export type EmailSection =
  | "dashboard"
  | "subscribers"
  | "compose"
  | "templates"
  | "magnets"
  | "forms"
  | "handoff"
  | "best3"
  | "domain"
  | "settings";

export function emailHrefs(onOs: boolean) {
  const root = onOs ? "/email" : "/os/email";
  return {
    dashboard: root,
    subscribers: `${root}/subscribers`,
    compose: `${root}/compose`,
    templates: `${root}/templates`,
    magnets: `${root}/lead-magnets`,
    forms: `${root}/signup-forms`,
    handoff: `${root}/lists/handoff`,
    best3: `${root}/lists/best-3`,
    domain: `${root}/sending-domain`,
    settings: `${root}/settings`,
    today: osHrefs(onOs).today,
    exportSubscribers: "/api/os/email/subscribers/export",
  };
}

export function emailNav(onOs: boolean): { id: EmailSection; label: string; href: string; group: "Email" | "Lists" | "System" }[] {
  const hrefs = emailHrefs(onOs);
  return [
    { id: "dashboard", label: "Dashboard", href: hrefs.dashboard, group: "Email" },
    { id: "subscribers", label: "Subscribers", href: hrefs.subscribers, group: "Email" },
    { id: "compose", label: "Compose", href: hrefs.compose, group: "Email" },
    { id: "templates", label: "Templates", href: hrefs.templates, group: "Email" },
    { id: "magnets", label: "Lead magnets", href: hrefs.magnets, group: "Email" },
    { id: "forms", label: "Signup forms", href: hrefs.forms, group: "Email" },
    { id: "handoff", label: "The Handoff", href: hrefs.handoff, group: "Lists" },
    { id: "best3", label: "Best 3", href: hrefs.best3, group: "Lists" },
    { id: "domain", label: "Sending domain", href: hrefs.domain, group: "System" },
    { id: "settings", label: "Settings", href: hrefs.settings, group: "System" },
  ];
}

export function emailSection(pathname: string): EmailSection {
  const path = pathname.replace(/\/$/, "") || "/";
  const bare = path.startsWith("/os/") ? path.slice(3) : path;
  if (bare === "/email") return "dashboard";
  if (bare.startsWith("/email/subscribers")) return "subscribers";
  if (bare.startsWith("/email/compose")) return "compose";
  if (bare.startsWith("/email/templates")) return "templates";
  if (bare.startsWith("/email/lead-magnets")) return "magnets";
  if (bare.startsWith("/email/signup-forms")) return "forms";
  if (bare.startsWith("/email/lists/best-3")) return "best3";
  if (bare.startsWith("/email/lists/handoff")) return "handoff";
  if (bare.startsWith("/email/sending-domain")) return "domain";
  if (bare.startsWith("/email/settings")) return "settings";
  return "dashboard";
}
