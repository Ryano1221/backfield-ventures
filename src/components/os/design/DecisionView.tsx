import Link from "next/link";
import { Mark } from "../Mark";
import type { ExplainedDecision } from "@/lib/os/explain";

export function DecisionView({
  item,
  detailHref,
  compact = false,
}: {
  item: ExplainedDecision;
  detailHref?: string;
  compact?: boolean;
}) {
  if (compact && detailHref) {
    return (
      <Link className="dx-row" href={detailHref}>
        <Mark name={item.who} domain={item.domain} logoUrl={item.logoUrl} />
        <span>
          <strong>{item.who}</strong>
          <em>{item.why}</em>
        </span>
      </Link>
    );
  }

  return (
    <article className="dx-card">
      <header className="dx-who">
        <Mark name={item.who} domain={item.domain} logoUrl={item.logoUrl} />
        <div>
          <h2>{item.who}</h2>
          {item.role ? <p className="dx-role">{item.role}</p> : null}
        </div>
      </header>
      <p className="dx-why">{item.why}</p>
      <h3>What happened</h3>
      <p>{item.what}</p>
      {item.message ? (
        <>
          <h3>If you approve, this is what goes out</h3>
          <blockquote className="dx-message">{item.message}</blockquote>
        </>
      ) : (
        <>
          <h3>If you approve</h3>
          <p>You approve this item. There is no outgoing message attached.</p>
        </>
      )}
      <div className="dx-actions">
        <button type="button" className="dx-primary">
          {item.primary}
        </button>
        {item.canEdit ? (
          <button type="button" className="dx-secondary">
            Edit
          </button>
        ) : (
          <button type="button" className="dx-secondary">
            Not now
          </button>
        )}
        <details className="dx-more">
          <summary aria-label="More actions">...</summary>
          <div>
            <button type="button">Snooze until tomorrow</button>
            <button type="button">Skip</button>
          </div>
        </details>
      </div>
    </article>
  );
}
