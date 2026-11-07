import type { SetupItem } from "@/lib/os/leads/setup";

/**
 * What's wired up for Leads and Outreach. One folded line with a progress bar,
 * so it never pushes the leads down; gone entirely once everything is ready.
 */
export function SetupCard({ items }: { items: SetupItem[] }) {
  const ready = items.filter((item) => item.ok).length;
  if (ready === items.length) return null;
  const missing = items.length - ready;
  return (
    <details className="sx-card autopilot setup-card">
      <summary className="setup-sum">
        <span className="setup-title">
          Setup: {ready} of {items.length} ready
        </span>
        <span className="setup-bar" aria-hidden="true">
          <span style={{ width: `${(ready / items.length) * 100}%` }} />
        </span>
        <span className="setup-fix">
          {missing} to fix
        </span>
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
