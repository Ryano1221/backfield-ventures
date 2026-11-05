"use client";

import Link from "next/link";
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
      <div className="deals-tools">
        <input className="pill" value={query} placeholder="Search pitches" aria-label="Search pitches" onChange={(event) => setQuery(event.target.value)} />
        <div className="segment" role="group" aria-label="Sort pitches">
          {(["rating", "score", "newest", "name"] as DealSort[]).map((id) => (
            <button key={id} type="button" aria-pressed={sort === id} onClick={() => setSort(id)}>
              {id === "rating" ? "Rating" : id === "score" ? "Score" : id === "newest" ? "Newest" : "Name"}
            </button>
          ))}
        </div>
        <div className="segment" role="group" aria-label="Filter pitches">
          {RATING_FILTERS.map((item) => (
            <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>
              {item.label} <span className="num">{counts[item.id]}</span>
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
                    <p className="clamp1">{deal.summary || deal.title || "No summary in this snapshot."}</p>
                    <div className="deal-meta">
                      {deal.sector ? <span className="chip">{deal.sector}</span> : null}
                      {deal.stage ? <span className="chip">{deal.stage}</span> : null}
                      <span className="num chip">{deal.score == null ? "No score" : `Score ${deal.score}`}</span>
                    </div>
                  </div>
                </Link>
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
    </>
  );
}

export function DealLinks({ deal }: { deal: DeskDeal }) {
  if (!deal.website && !deal.deckUrl && !deal.deckNote) return null;
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
      ) : deal.deckNote ? (
        <span className="deck-state" title={deal.deckNote} aria-label={deal.deckNote}>
          Deck
        </span>
      ) : null}
    </div>
  );
}
