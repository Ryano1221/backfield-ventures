import { displayParty } from "./interactions";
import type { ActivityItem, CrmPerson, Interaction, Snapshot } from "./types";

const DAY = 24 * 60 * 60 * 1000;

export function needsFollowUp(person: CrmPerson, now = Date.now()): boolean {
  if (!person.next_step_due) return false;
  const due = Date.parse(person.next_step_due);
  if (!Number.isFinite(due)) return false;
  return due <= endOfUtcDay(now);
}

export function isHot(person: CrmPerson, now = Date.now()): boolean {
  if (!person.last_touch_at) return false;
  const touch = Date.parse(person.last_touch_at);
  if (!Number.isFinite(touch)) return false;
  const age = now - touch;
  return age >= -60_000 && age <= 7 * DAY;
}

export function personTimeline(person: CrmPerson, snapshot: Snapshot | null): { at: string; label: string; detail: string }[] {
  if (!snapshot) return [];
  const name = person.name.trim().toLowerCase();
  const rows: { at: string; label: string; detail: string }[] = [];
  for (const item of snapshot.interactions) {
    if (mentions(item.from, name) || mentions(item.to, name) || mentions(item.title, name)) {
      rows.push({ at: item.timestamp, label: `${displayParty(item.from)} to ${displayParty(item.to)}`, detail: item.title });
    }
  }
  for (const item of snapshot.activity) {
    if (mentions(item.actor, name) || mentions(item.summary, name)) {
      rows.push({ at: item.timestamp, label: item.actor, detail: item.summary });
    }
  }
  return rows.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

function mentions(value: string, name: string): boolean {
  return name.length > 0 && value.toLowerCase().includes(name);
}

function endOfUtcDay(now: number): number {
  const date = new Date(now);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999);
}

export type TimelineRow = ReturnType<typeof personTimeline>[number];
export type { ActivityItem, Interaction };
