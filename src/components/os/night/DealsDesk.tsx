"use client";

import { useMemo, useState } from "react";
import { RATING_FILTERS, visibleDeals, ratingCounts, type DealFilter, type DealSort } from "@/lib/os/deals";
import type { DeskDeal } from "@/lib/os/night";
import { osHrefs } from "@/lib/os/nav";
import { shownPitchRating } from "@/lib/os/pitch-rate";
import { Logo } from "./Logo";
import { useNightActions } from "./NightFrame";
import { RateControl } from "./RateControl";

export function DealsDesk({ deals, reviewing, onOs }: { deals: DeskDeal[]; reviewing: number; onOs: boolean }) {
  const hrefs = osHrefs(onOs);
  const { actions } = useNightActions();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<DealFilter>("all");
  const [sort, setSort] = useState<DealSort>("rating");
  const ratingOf = useMemo(
    () => (deal: DeskDeal) => shownPitchRating({ logged: deal.loggedRating, generatedAt: deal.generatedAt, actions, pitchId: deal.id }),
    [actions],
  );
  const counts = ratingCounts(deals, ratingOf);
  const rows = visibleDeals(deals, query, filter, sort, ratingOf);

  return (
    <>
      <div className="lbl eyebrow">Deals</div>
      <h1 className="d-xl">
        {deals.length.toLocaleString("en-US")} {deals.length === 1 ? "pitch" : "pitches"}.
      </h1>
      <p className="lede">
        {reviewing.toLocaleString("en-US")} {reviewing === 1 ? "is" : "are"} in review.
      </p>
      <section className="card">
        <div className="h">
          <span className="lbl">Pitches</span>
        </div>
        <div className="filterbar">
          <input className="search" value={query} placeholder="Search company, sector, source" aria-label="Search pitches" onChange={(event) => setQuery(event.target.value)} />
          <label className="lbl">
            Sort
            <select className="stage-select" aria-label="Sort pitches" value={sort} onChange={(event) => setSort(event.target.value as DealSort)}>
              <option value="rating">Rating</option>
              <option value="score">Score</option>
              <option value="newest">Newest</option>
              <option value="name">Name</option>
            </select>
          </label>
        </div>
        <div className="deal-filters">
          {RATING_FILTERS.map((item) => (
            <button key={item.id} type="button" className="deal-chip" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>
              {item.label} <span>{counts[item.id]}</span>
            </button>
          ))}
        </div>
        {rows.length ? (
          <div className="deal-list">
            {rows.map((deal) => (
              <article className="deal-card" key={deal.id} id={deal.id}>
                <a className="deal-open" href={hrefs.deal(deal.id)}>
                  <Logo name={deal.company} domain={deal.domain} logoUrl={deal.logoUrl} />
                  <div>
                    <div className="n">{deal.company}</div>
                    {deal.title ? <div className="d">{deal.title}</div> : null}
                    {deal.summary ? <div className="d clamp2">{deal.summary}</div> : null}
                    <div className="deal-meta">
                      {deal.sector ? <span>{deal.sector}</span> : null}
                      {deal.stage ? <span className="tag">{deal.stage}</span> : null}
                      {deal.score == null ? <span className="lbl">Not scored</span> : <span className="lbl">Score {deal.score}</span>}
                      {deal.waiting ? <span className="lbl">{deal.waiting}</span> : null}
                    </div>
                  </div>
                </a>
                <DealLinks deal={deal} />
                <RateControl id={deal.id} company={deal.company} logged={deal.loggedRating} generatedAt={deal.generatedAt} />
              </article>
            ))}
          </div>
        ) : (
          <p className="t-body muted" style={{ padding: "16px 18px" }}>
            {deals.length ? "No pitches match." : "No pitches in this snapshot."}
          </p>
        )}
      </section>
    </>
  );
}

export function DealLinks({ deal }: { deal: DeskDeal }) {
  if (!deal.website && !deal.deckUrl && !deal.deckNote) return null;
  return (
    <div className="deal-links">
      {deal.website ? (
        <a className="lnk" href={deal.website} target="_blank" rel="noopener noreferrer">
          Website
        </a>
      ) : null}
      {deal.deckUrl ? (
        <a className="lnk" href={deal.deckUrl} target="_blank" rel="noopener noreferrer">
          Deck
        </a>
      ) : null}
      {deal.deckNote ? <p className="deal-note">{deal.deckNote}</p> : null}
    </div>
  );
}
