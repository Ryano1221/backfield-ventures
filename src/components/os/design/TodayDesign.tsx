import Link from "next/link";
import { Mark } from "../Mark";
import { DecisionView } from "./DecisionView";
import { DesignFrame } from "./DesignFrame";
import type { ExplainedDecision } from "@/lib/os/explain";
import { blankToNull } from "@/lib/os/present";
import type { Pitch, PitchStatus } from "@/lib/os/types";

export function TodayDesign({
  items,
  deals,
  sample,
  todayHref,
  crmHref,
  botsHref,
  detailBase,
}: {
  items: ExplainedDecision[];
  deals: Pitch[];
  sample: boolean;
  todayHref: string;
  crmHref: string;
  botsHref: string;
  detailBase: string;
}) {
  const [open, ...rest] = items;
  return (
    <DesignFrame todayHref={todayHref} crmHref={crmHref} botsHref={botsHref} active="today">
      {sample ? <p className="dx-banner">Design sample, shaped like the live snapshot. Nothing on this page sends or saves.</p> : <p className="dx-banner">Design preview. These buttons do not send or save yet.</p>}
      <p className="dx-counts">
        <span>
          <strong>{items.length}</strong>
          {items.length === 1 ? " decision is waiting on you" : " decisions are waiting on you"}
        </span>
        <span>
          <strong>{deals.length}</strong>
          {deals.length === 1 ? " deal to review" : " deals to review"}
        </span>
      </p>
      <section className="dx-group">
        <h1>Decisions</h1>
        {open ? <DecisionView item={open} /> : <p className="dx-empty">Nothing is waiting on you.</p>}
        {rest.length ? (
          <div className="dx-rest">
            {rest.map((item) => (
              <DecisionView key={item.id} item={item} compact detailHref={`${detailBase}/${encodeURIComponent(item.id)}`} />
            ))}
          </div>
        ) : null}
      </section>
      <section className="dx-group">
        <h1>Deals to review</h1>
        <p className="dx-intro">These are companies, not messages. Opening one does not send anything.</p>
        <ul className="dx-deals">
          {deals.map((deal) => {
            const facts = [blankToNull(deal.sector), blankToNull(deal.stage), statusLabel(deal.status)].filter(Boolean).join(" · ");
            return (
              <li key={deal.company}>
                <Mark name={deal.company} domain={deal.domain} logoUrl={deal.logo_url} />
                <span>
                  <strong>{deal.company}</strong>
                  {facts ? <em>{facts}</em> : null}
                  {deal.summary ? <p>{deal.summary}</p> : null}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
      {open ? (
        <p className="dx-foot">
          <Link href={`${detailBase}/${encodeURIComponent(open.id)}`}>Open this decision on its own page</Link>
          <span> J and K move between decisions on that page.</span>
        </p>
      ) : null}
    </DesignFrame>
  );
}

function statusLabel(status: PitchStatus): string | null {
  if (status === "new") return "New";
  if (status === "reviewing") return "Reviewing";
  if (status === "passed") return "Passed";
  if (status === "advanced") return "Advanced";
  return null;
}
