export function snoozeUntil(which: "tomorrow" | "week", now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const add = which === "tomorrow" ? 1 : 7;
  return new Date(Date.UTC(year, month - 1, day + add, 14, 0, 0)).toISOString();
}
