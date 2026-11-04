import type { OsAction, Pitch, PitchRating } from "./types";

export const RATING_ORDER: PitchRating[] = ["great", "good", "maybe", "no"];

export function isPitchRating(value: unknown): value is PitchRating {
  return value === "great" || value === "good" || value === "maybe" || value === "no";
}

export function pitchTarget(pitch: Pick<Pitch, "id" | "company">): string {
  return pitch.id || `pitch:${pitch.company}`;
}

export function latestPitchRate(actions: OsAction[], pitchId: string): { rating: PitchRating; at: string } | null {
  let found: { rating: PitchRating; at: string } | null = null;
  for (const action of actions) {
    if (action.type !== "rate" || action.target_id !== pitchId || action.status === "failed") continue;
    if (!isPitchRating(action.payload.rating)) continue;
    if (!found || action.created_at >= found.at) found = { rating: action.payload.rating, at: action.created_at };
  }
  return found;
}

/** A stored rate wins over the snapshot rating until a newer snapshot carries the same rating. */
export function shownPitchRating(input: {
  logged: PitchRating | null;
  generatedAt: string;
  actions: OsAction[];
  pitchId: string;
}): PitchRating | null {
  const stored = latestPitchRate(input.actions, input.pitchId);
  if (!stored) return input.logged;
  const snapshotAt = Date.parse(input.generatedAt);
  const actionAt = Date.parse(stored.at);
  const newerSnapshot = Number.isFinite(snapshotAt) && Number.isFinite(actionAt) && snapshotAt > actionAt;
  if (newerSnapshot && input.logged === stored.rating) return input.logged;
  return stored.rating;
}

export function rateKey(pitchId: string, rating: PitchRating): string {
  const slug = pitchId.replace(/[^A-Za-z0-9_-]/g, "-").replace(/-+/g, "-").slice(0, 80);
  return `rate:${slug}:${rating}`;
}
