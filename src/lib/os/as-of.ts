/**
 * Counts like "done today" come from the last snapshot. When that snapshot is
 * stale they are not today's numbers, so the label names the snapshot's day.
 *
 * `stamp` is the Chicago snapshot label, e.g. "Nov 3, 12:00pm CT".
 */
export function asOfWord(stale: boolean, stamp: string | null | undefined): string {
  if (!stale) return "today";
  const day = (stamp || "").split(",")[0]?.trim();
  return day ? `on ${day}` : "at last update";
}

/** Capitalized form for labels that start a line: "Today" or "On Nov 3". */
export function asOfTitle(stale: boolean, stamp: string | null | undefined): string {
  const word = asOfWord(stale, stamp);
  return word.charAt(0).toUpperCase() + word.slice(1);
}
