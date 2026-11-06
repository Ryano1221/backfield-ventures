"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { pitchesByDay, sourceStats, RATING_FILTERS, visibleDeals, ratingCounts, type DealFilter, type DealSort } from "@/lib/os/deals";
import type { DeskDeal } from "@/lib/os/night";
import { osHrefs } from "@/lib/os/nav";
import { shownPitchRating } from "@/lib/os/pitch-rate";
import { Logo } from "./Logo";
import { useNightActions } from "./NightFrame";
import { AddCompany } from "./AddCompany";
import { Columns } from "./Charts";
import { PortfolioCard } from "./PortfolioCard";
import { RateControl } from "./RateControl";
import type { Portfolio } from "@/lib/os/portfolio";

export function DealsDesk({ deals, reviewing, onOs, portfolio }: { deals: DeskDeal[]; reviewing: number; onOs: boolean; portfolio?: Portfolio }) {
  const hrefs = osHrefs(onOs);
  const { actions } = useNightActions();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<DealFilter>("all");
  const [sort, setSort] = useState<DealSort>("rating");
  const ratingOf = useMemo(
    () => (deal: DeskDeal) => shownPitchRating({ logged: deal.loggedRating, generatedAt: deal.generatedAt, actions, pitchId: deal.id }),
    [actions],
  );
  const [stage, setStage] = useState<string>("all");
  const pitchCount = deals.filter((deal) => deal.status !== "tracking").length;
  const tracked = deals.length - pitchCount;
  const counts = { ...ratingCounts(deals.filter((deal) => deal.status !== "tracking"), ratingOf), all: deals.length };
  const rows = visibleDeals(deals, query, filter, sort, ratingOf).filter((deal) => stage === "all" || deal.status === stage);
  const flow = deals.length ? pitchesByDay(deals, deals[0].generatedAt, 14) : [];
  const flowTotal = flow.reduce((sum, row) => sum + row.count, 0);
  const sources = sourceStats(deals, ratingOf as (deal: never) => string | null);
  const pipeline = PIPELINE.map((step) => ({ ...step, count: deals.filter((deal) => deal.status === step.id).length }));

  return (
    <>
      <div className="lbl eyebrow">Investments</div>
      <h1 className="d-xl">
        {deals.length.toLocaleString("en-US")} {deals.length === 1 ? "company" : "companies"}.
      </h1>
      <p className="lede">
        {pitchCount.toLocaleString("en-US")} {pitchCount === 1 ? "pitch" : "pitches"}, {reviewing.toLocaleString("en-US")} in review
        {tracked ? `. ${tracked.toLocaleString("en-US")} more tracked from The Handoff, Best 3 and your founders` : ""}.
      </p>
      <AddCompany dealHref={hrefs.deal} />
      {flow.length ? (
        <section className="deal-flow" aria-label="Deal flow">
          <div className="deal-flow-k">
            <b>{flowTotal.toLocaleString("en-US")}</b>
            <span>{flowTotal === 1 ? "pitch" : "pitches"} in the last 14 days</span>
          </div>
          <Columns rows={flow} label="Pitches per day, last 14 days" unit={["pitch", "pitches"]} />
        </section>
      ) : null}
      {sources.length > 1 ? (
        <details className="sx-card deal-sources-card">
          <summary>Where your deals come from · {sources.length} sources</summary>
          <div className="spv-backers-scroll">
            <table className="port-table">
              <thead>
                <tr>
                  <th scope="col">Source</th>
                  <th scope="col">Pitches</th>
                  <th scope="col">Advanced</th>
                  <th scope="col">Passed</th>
                  <th scope="col">Avg score</th>
                  <th scope="col">You liked</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((row) => (
                  <tr key={row.source}>
                    <th scope="row">{row.source}</th>
                    <td>{row.pitches}</td>
                    <td>{row.advanced ? `${row.advanced} (${Math.round((row.advanced / row.pitches) * 100)}%)` : "0"}</td>
                    <td>{row.passed}</td>
                    <td>{row.avgScore == null ? "None" : row.avgScore.toFixed(1)}</td>
                    <td>{row.liked}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}
      {portfolio ? <PortfolioCard portfolio={portfolio} spvHref={hrefs.spvItem} dealHref={hrefs.deal} portfolioHref={hrefs.portfolio} /> : null}
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
      <nav className="deal-pipeline" aria-label="Pipeline">
        {pipeline.map((step) => (
          <button key={step.id} type="button" aria-pressed={stage === step.id} onClick={() => setStage((current) => (current === step.id ? "all" : step.id))}>
            <b>{step.count.toLocaleString("en-US")}</b>
            <span>{step.label}</span>
          </button>
        ))}
      </nav>
      <div className="deals-tools">
        <input className="pill" value={query} placeholder="Search companies" aria-label="Search companies" onChange={(event) => setQuery(event.target.value)} />
        <div className="segment" role="group" aria-label="Sort pitches">
          {(["rating", "score", "newest", "name"] as DealSort[]).map((id) => (
            <button key={id} type="button" aria-pressed={sort === id} onClick={() => setSort(id)}>
              {id === "rating" ? "Rating" : id === "score" ? "Score" : id === "newest" ? "Newest" : "Name"}
            </button>
          ))}
        </div>
        <div className="segment scroll" role="group" aria-label="Filter pitches">
          {RATING_FILTERS.map((item) => (
            <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>
              <span>{item.label}</span>
              <span className="num">{counts[item.id]}</span>
            </button>
          ))}
        </div>
      </div>
        {rows.length ? (
          <div className="deal-list">
            {rows.map((deal) => (
              <article className="deal-card" key={deal.id} id={deal.id}>
                <Link className="deal-open" href={hrefs.deal(deal.id)} prefetch>
                  <Logo name={deal.company} domain={deal.domain} logoUrl={deal.logoUrl} />
                  <div>
                    <div className="n">{deal.company}</div>
                    <p className="clamp1">{deal.summary || deal.title || (deal.founder ? `Founder: ${deal.founder}` : "No summary in this snapshot.")}</p>
                    <div className="deal-meta">
                      <span className={`chip st-${deal.status}`}>{deal.statusLabel}</span>
                      {deal.sector ? <span className="chip">{deal.sector}</span> : null}
                      {deal.stage ? <span className="chip">{deal.stage}</span> : null}
                      {deal.status === "tracking" ? (deal.source ? <span className="chip">{deal.source}</span> : null) : <span className="num chip">{deal.score == null ? "No score" : `Score ${deal.score}`}</span>}
                      {deal.waiting ? <span className="chip">{deal.waiting}</span> : null}
                    </div>
                  </div>
                </Link>
                <DealLinks deal={deal} />
                {deal.status === "tracking" ? null : <RateControl id={deal.id} company={deal.company} logged={deal.loggedRating} generatedAt={deal.generatedAt} />}
              </article>
            ))}
          </div>
        ) : (
          <p className="t-body muted" style={{ padding: "16px 18px" }}>
            {deals.length ? "No companies match." : "No pitches in this snapshot."}
          </p>
        )}
    </>
  );
}

const PIPELINE = [
  { id: "new", label: "New" },
  { id: "reviewing", label: "In review" },
  { id: "advanced", label: "Advanced" },
  { id: "passed", label: "Passed" },
  { id: "tracking", label: "Tracking" },
];

export function DealLinks({ deal }: { deal: DeskDeal }) {
  if (!deal.website && !deal.deckUrl) return null;
  return (
    <div className="deal-links">
      {deal.website ? (
        <a className="btn" href={deal.website} target="_blank" rel="noopener noreferrer">
          Website
        </a>
      ) : null}
      {deal.deckUrl ? (
        <a className="btn" href={deal.deckUrl} target="_blank" rel="noopener noreferrer">
          Deck
        </a>
      ) : null}
    </div>
  );
}
