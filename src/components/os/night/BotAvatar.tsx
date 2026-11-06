/**
 * A logo for every bot: its department's emblem and color, with a ring that
 * shows what it is doing. Working spins, needs-you pulses, paused fades.
 * Motion turns off for people who ask for reduced motion (see os-desk.css).
 */

export type Dept = "executive" | "network" | "investment" | "intelligence" | "growth" | "firm_os";

export const DEPT: Record<Dept, { label: string; color: string }> = {
  executive: { label: "Executive", color: "#123D22" },
  network: { label: "Network", color: "#25507A" },
  investment: { label: "Investment", color: "#8A5A12" },
  intelligence: { label: "Intelligence", color: "#5B3F8C" },
  growth: { label: "Growth", color: "#A2451F" },
  firm_os: { label: "Firm OS", color: "#3D4650" },
};

export function deptOf(team: string | null | undefined): Dept {
  const key = (team || "").trim().toLowerCase().replace(/\s+/g, "_");
  if (key in DEPT) return key as Dept;
  if (key.startsWith("exec")) return "executive";
  if (key.startsWith("net")) return "network";
  if (key.startsWith("inv")) return "investment";
  if (key.startsWith("intel")) return "intelligence";
  if (key.startsWith("gro")) return "growth";
  return "firm_os";
}

/** Line emblems on a 24px grid, one per department. */
export function DeptGlyph({ dept, size = 16 }: { dept: Dept; size?: number }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg className="dept-glyph" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {dept === "executive" ? <path {...common} d="M4 17.5h16L18.6 8l-4.1 3.6L12 5.5l-2.5 6.1L5.4 8 4 17.5Zm0 2.5h16" /> : null}
      {dept === "network" ? (
        <g {...common}>
          <circle cx="6" cy="7" r="2.4" />
          <circle cx="18" cy="7" r="2.4" />
          <circle cx="12" cy="18" r="2.4" />
          <path d="M8.3 7.6h7.4M7.2 9.1l3.6 6.8M16.8 9.1l-3.6 6.8" />
        </g>
      ) : null}
      {dept === "investment" ? <path {...common} d="M4 18.5l5-5.5 3.5 3L20 7.5m0 0h-4.5m4.5 0V12" /> : null}
      {dept === "intelligence" ? (
        <g {...common}>
          <circle cx="10.5" cy="10.5" r="5.5" />
          <path d="M14.6 14.6 19.5 19.5M8.5 10.5h4M10.5 8.5v4" />
        </g>
      ) : null}
      {dept === "growth" ? <path {...common} d="M12 20v-8m0 0c0-3.5-2.6-6-6.5-6 0 3.6 2.7 6 6.5 6Zm0 0c0-3.9 2.8-6.5 6.5-6.5 0 3.9-2.7 6.5-6.5 6.5Z" /> : null}
      {dept === "firm_os" ? (
        <g {...common}>
          <path d="M12 3.5l7.5 4.3v8.4L12 20.5l-7.5-4.3V7.8L12 3.5Z" />
          <circle cx="12" cy="12" r="2.8" />
        </g>
      ) : null}
    </svg>
  );
}

const STATE: Record<string, string> = {
  Working: "is-working",
  "Needs Ryan": "is-needs",
  Idle: "is-idle",
  Paused: "is-paused",
  Degraded: "is-warn",
  Failed: "is-fail",
};

export function BotAvatar({ team, status, size = 44, title }: { team: string | null | undefined; status?: string; size?: number; title?: string }) {
  const dept = deptOf(team);
  const { color, label } = DEPT[dept];
  return (
    <span className={`bot-av ${status ? STATE[status] ?? "" : ""}`} style={{ ["--dept" as string]: color, width: size, height: size }} title={title ?? `${label}${status ? ` · ${status}` : ""}`} aria-hidden="true">
      <span className="bot-av-ring" />
      <span className="bot-av-face">
        <DeptGlyph dept={dept} size={Math.round(size * 0.48)} />
      </span>
      {status === "Failed" || status === "Degraded" ? <span className="bot-av-flag" /> : null}
    </span>
  );
}
