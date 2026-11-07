import type { SetupItem } from "@/lib/os/leads/setup";

/** What's wired up for Leads and Outreach. Opens by itself when something is missing. */
export function SetupCard({ items }: { items: SetupItem[] }) {
  const ready = items.filter((item) => item.ok).length;
  return (
    <details className="sx-card autopilot setup-card" open={ready < items.length}>
      <summary className="lead-name">
        Setup: {ready} of {items.length} ready
      </summary>
      <ul className="setup-list">
        {items.map((item) => (
          <li key={item.key} className={item.ok ? "is-ok" : "is-missing"}>
            <span className="setup-mark" aria-hidden="true">
              {item.ok ? "✓" : "!"}
            </span>
            <span>
              <b>{item.label}</b>
              <span className="sx-hint">{item.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
