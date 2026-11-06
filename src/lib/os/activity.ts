import { weekdayCt } from "./night";

export type ActivityItem = { at: string; timeLabel: string; actor: string; summary: string };
export type ActivityDay = { day: string; items: (ActivityItem & { time: string })[] };

/** "12:00pm CT" for an ISO stamp, in Chicago. Falls back to the full label. */
export function timeCt(at: string, fallback: string): string {
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return fallback;
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", hour: "numeric", minute: "2-digit", hour12: true }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("hour")}:${get("minute")}${get("dayPeriod").toLowerCase().replace(/\./g, "")} CT`;
}

/** Groups newest-first activity under Chicago day headings, keeping order. */
export function groupActivityByDay(items: ActivityItem[]): ActivityDay[] {
  const days: ActivityDay[] = [];
  for (const item of items) {
    const day = weekdayCt(item.at) ?? "Undated";
    let bucket = days[days.length - 1];
    if (!bucket || bucket.day !== day) {
      bucket = { day, items: [] };
      days.push(bucket);
    }
    bucket.items.push({ ...item, time: timeCt(item.at, item.timeLabel) });
  }
  return days;
}
