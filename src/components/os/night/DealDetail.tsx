import Link from "next/link";
import type { DeskDeal } from "@/lib/os/night";
import { Logo } from "./Logo";
import { DealLinks } from "./DealsDesk";
import { RateControl } from "./RateControl";

export function DealDetail({ deal, dealsHref }: { deal: DeskDeal; dealsHref: string }) {
  const source = (field: string) => deal.sources.find((item) => item.field === field)?.source || null;
  return (
    <>
      <div className="lbl eyebrow">
        <Link href={dealsHref} prefetch>Deals</Link>
        {` / ${deal.company}`}
      </div>
      <div className="phead">
        <Logo name={deal.company} domain={deal.domain} logoUrl={deal.logoUrl} large />
        <div>
          <h1 className="d-l">{deal.company}</h1>
          {deal.title ? <p className="sub">{deal.title}</p> : null}
          <div className="facts">
            {deal.stage ? <span className="tag">{deal.stage}</span> : null}
            <span className="tag">{deal.statusLabel}</span>
          </div>
        </div>
      </div>
      {deal.summary ? <p className="lede">{deal.summary}</p> : null}
      <DealLinks deal={deal} />
      <RateControl id={deal.id} company={deal.company} logged={deal.loggedRating} generatedAt={deal.generatedAt} />
      <dl className="dl deal-fields">
        <Field label="Sector" value={deal.sector} source={source("sector")} />
        <Field label="Stage" value={deal.stage} source={source("stage")} />
        <Field label="Score" value={deal.score == null ? null : String(deal.score)} source={source("score")} />
        <Field label="Status" value={deal.statusLabel} source={source("status")} />
        <Field label="Source" value={deal.source} source={source("source")} />
        <Field label="Received" value={deal.received} source={source("received")} />
        <Field label="Founder" value={deal.founder} source={source("founder")} />
        <Field label="Domain" value={deal.domain} source={source("domain")} />
        <Field label="Website" value={deal.website} source={source("website")} />
        <Field label="Deck" value={deal.deckUrl} source={source("deck_url") || source("deck")} />
        <Field label="Deck note" value={deal.deckNote} source={source("deck_note")} />
        <Field label="Rating" value={deal.loggedRating ? deal.loggedRating.charAt(0).toUpperCase() + deal.loggedRating.slice(1) : deal.loggedRating} source={source("ryan_rating")} />
      </dl>
      <details className="deal-terms">
        <summary>Score, rating and status</summary>
        <dl>
          <dt>Score</dt>
          <dd>The number the office gives each pitch. A starting point, not a decision.</dd>
          <dt>Rating</dt>
          <dd>Yours: great, good, maybe or no.</dd>
          <dt>Status</dt>
          <dd>Where the pitch sits: new, reviewing, advanced or passed.</dd>
        </dl>
      </details>
      {deal.sources.length ? (
        // File paths and run ids help when something looks wrong, not day to day.
        <details className="deal-sources">
          <summary>Where this data came from</summary>
          <dl>
            {deal.sources.map((item) => (
              <div key={item.field} style={{ display: "contents" }}>
                <dt>{item.label}</dt>
                <dd>{item.source}</dd>
              </div>
            ))}
          </dl>
        </details>
      ) : null}
    </>
  );
}

function Field({ label, value }: { label: string; value: string | null; source?: string | null }) {
  if (!value) return null;
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}
