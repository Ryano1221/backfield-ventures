import type { OutreachTrack, Snapshot } from "./types";

/**
 * Daily outreach by track, kept across snapshots so the OS can show a
 * week, not just today. Each ingest writes the day it reports; a later
 * snapshot for the same day replaces it.
 */

export type DayRow = { track: string; label: string; sent: number; floor: number };
export type OutreachHistory = { days: Record<string, DayRow[]> };

export type TrackWeek = {
  track: string;
  label: string;
  days: { date: string; weekday: string; sent: number | null; floor: number | null }[];
  sentTotal: number;
  floorTotal: number;
  hitDays: number;
  reportedDays: number;
  lastWeekSent: number | null;
};

const KEEP_DAYS = 60;

export function ctDate(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms));
}

export function parseHistory(raw: string | null): OutreachHistory {
  if (!raw) return { days: {} };
  try {
    const parsed = JSON.parse(raw) as OutreachHistory;
    if (!parsed || typeof parsed !== "object" || !parsed.days || typeof parsed.days !== "object") return { days: {} };
    const days: Record<string, DayRow[]> = {};
    for (const [date, rows] of Object.entries(parsed.days)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Array.isArray(rows)) continue;
      days[date] = rows.filter((row) => row && typeof row.track === "string" && Number.isFinite(row.sent) && Number.isFinite(row.floor));
    }
    return { days };
  } catch {
    return { days: {} };
  }
}

/** Fold one snapshot's outreach rows into the history, by the day each row is for. */
export function recordOutreach(history: OutreachHistory, snapshot: Pick<Snapshot, "generated_at" | "outreach">): OutreachHistory {
  const fallback = ctDate(Date.parse(snapshot.generated_at) || Date.now());
  const days = { ...history.days };
  const byDay = new Map<string, DayRow[]>();
  for (const row of snapshot.outreach) {
    const date = row.as_of && /^\d{4}-\d{2}-\d{2}/.test(row.as_of) ? row.as_of.slice(0, 10) : fallback;
    byDay.set(date, [...(byDay.get(date) ?? []), toRow(row)]);
  }
  for (const [date, rows] of byDay) {
    const kept = (days[date] ?? []).filter((old) => !rows.some((row) => row.track === old.track));
    days[date] = [...kept, ...rows];
  }
  const keep = Object.keys(days).sort().slice(-KEEP_DAYS);
  return { days: Object.fromEntries(keep.map((date) => [date, days[date]!])) };
}

function toRow(row: OutreachTrack): DayRow {
  return { track: row.track, label: row.label || row.track, sent: row.sent, floor: row.floor };
}

/** The last seven days (ending today, CT) for each track that reported in the last two weeks. */
export function weekByTrack(history: OutreachHistory, now = Date.now()): TrackWeek[] {
  const dates = Array.from({ length: 7 }, (_, index) => ctDate(now - (6 - index) * 86_400_000));
  const prior = Array.from({ length: 7 }, (_, index) => ctDate(now - (13 - index) * 86_400_000));
  const tracks = new Map<string, string>();
  for (const date of [...prior, ...dates]) for (const row of history.days[date] ?? []) tracks.set(row.track, row.label);
  return [...tracks.entries()].map(([track, label]) => {
    const days = dates.map((date) => {
      const row = (history.days[date] ?? []).find((item) => item.track === track) ?? null;
      const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", weekday: "short" }).format(new Date(`${date}T12:00:00-06:00`));
      return { date, weekday, sent: row ? row.sent : null, floor: row ? row.floor : null };
    });
    const reported = days.filter((day) => day.sent != null);
    const lastWeek = prior.map((date) => (history.days[date] ?? []).find((item) => item.track === track)?.sent ?? null).filter((value): value is number => value != null);
    return {
      track,
      label,
      days,
      sentTotal: reported.reduce((sum, day) => sum + (day.sent ?? 0), 0),
      floorTotal: reported.reduce((sum, day) => sum + (day.floor ?? 0), 0),
      hitDays: reported.filter((day) => (day.sent ?? 0) >= (day.floor ?? 0) && (day.floor ?? 0) > 0).length,
      reportedDays: reported.length,
      lastWeekSent: lastWeek.length ? lastWeek.reduce((sum, value) => sum + value, 0) : null,
    };
  });
}
