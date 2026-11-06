import type { DeskDeal } from "./night";
import { RATING_ORDER } from "./pitch-rate";
import type { PitchRating } from "./types";

export type DealFilter = "all" | PitchRating | "unrated";
export type DealSort = "rating" | "score" | "newest" | "name";

const RATING_RANK: Record<PitchRating, number> = { great: 0, good: 1, maybe: 2, no: 3 };

export function dealMatchesQuery(deal: DeskDeal, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [deal.company, deal.title, deal.summary, deal.sector, deal.source].some((value) => value?.toLowerCase().includes(needle));
}

export function ratingCounts(deals: DeskDeal[], ratingOf: (deal: DeskDeal) => PitchRating | null): Record<DealFilter, number> {
  const counts: Record<DealFilter, number> = { all: deals.length, great: 0, good: 0, maybe: 0, no: 0, unrated: 0 };
  for (const deal of deals) {
    const rating = ratingOf(deal);
    if (rating) counts[rating] += 1;
    else counts.unrated += 1;
  }
  return counts;
}

export function visibleDeals(
  deals: DeskDeal[],
  query: string,
  filter: DealFilter,
  sort: DealSort,
  ratingOf: (deal: DeskDeal) => PitchRating | null,
): DeskDeal[] {
  const matched = deals.filter((deal) => {
    if (!dealMatchesQuery(deal, query)) return false;
    const rating = ratingOf(deal);
    if (filter === "all") return true;
    if (filter === "unrated") return rating == null;
    return rating === filter;
  });
  return [...matched].sort((a, b) => compareDeals(a, b, sort, ratingOf));
}

export function compareDeals(a: DeskDeal, b: DeskDeal, sort: DealSort, ratingOf: (deal: DeskDeal) => PitchRating | null): number {
  if (sort === "name") return a.company.localeCompare(b.company) || a.id.localeCompare(b.id);
  if (sort === "newest") return b.received.localeCompare(a.received) || a.company.localeCompare(b.company);
  if (sort === "score") return (b.score ?? -1) - (a.score ?? -1) || a.company.localeCompare(b.company);
  const rank = (deal: DeskDeal) => {
    const rating = ratingOf(deal);
    return rating ? RATING_RANK[rating] + 1 : 0;
  };
  return rank(a) - rank(b) || (b.score ?? -1) - (a.score ?? -1) || a.company.localeCompare(b.company);
}

export const RATING_FILTERS: { id: DealFilter; label: string }[] = [
  { id: "all", label: "All" },
  ...RATING_ORDER.map((id) => ({ id, label: id.charAt(0).toUpperCase() + id.slice(1) })),
  { id: "unrated", label: "Unrated" },
];

/** Pitches in per day for the last `days` days, oldest first, in Central time. */
export function pitchesByDay(deals: Pick<DeskDeal, "receivedIso">[], nowIso: string, days = 14): { day: string; label: string; count: number }[] {
  const key = (iso: string) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
    const t = Date.parse(iso);
    return Number.isFinite(t) ? new Date(t).toLocaleDateString("en-CA", { timeZone: "America/Chicago" }) : null;
  };
  const today = key(nowIso);
  if (!today) return [];
  const counts = new Map<string, number>();
  for (const deal of deals) {
    const day = key(deal.receivedIso);
    if (day) counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  const base = Date.parse(`${today}T12:00:00Z`);
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(base - (days - 1 - i) * 86_400_000);
    const day = d.toISOString().slice(0, 10);
    return { day, label: d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }), count: counts.get(day) ?? 0 };
  });
}
