/**
 * How warm a relationship is, 0 to 100: how far along they are (up to 60)
 * plus how recently you talked (up to 40). "Going cold" is someone already
 * engaged who hasn't heard from you in three weeks.
 */

const STAGE_WEIGHT: Record<string, number> = {
  committed: 60,
  closed: 60,
  im_in: 60,
  soft_circle: 58,
  docs: 58,
  data_room: 52,
  one_pager_sent: 50,
  call_held: 50,
  call_booked: 46,
  call_asked: 40,
  replied: 35,
  ready: 10,
  queued: 10,
  talking: 30,
  hold: 5,
  passed: 0,
  lost: 0,
  bounced: 0,
  dnc: 0,
  do_not_contact: 0,
};

const ENGAGED = new Set(["replied", "call_asked", "call_booked", "call_held", "one_pager_sent", "data_room", "soft_circle", "docs", "im_in", "talking"]);

export type WarmthBand = "hot" | "warm" | "cooling" | "cold";
export const BAND_LABEL: Record<WarmthBand, string> = { hot: "Hot", warm: "Warm", cooling: "Cooling", cold: "Cold" };

export function daysSince(iso: string | null, now: number): number | null {
  if (!iso) return null;
  const t = Date.parse(iso.length === 10 ? `${iso}T12:00:00-06:00` : iso);
  return Number.isFinite(t) ? Math.max(0, Math.floor((now - t) / 86_400_000)) : null;
}

export function warmth(stage: string | null, lastTouch: string | null, now: number): { score: number; band: WarmthBand; days: number | null; goingCold: boolean } {
  const key = (stage || "").toLowerCase();
  const days = daysSince(lastTouch, now);
  const stageScore = STAGE_WEIGHT[key] ?? 10;
  const recency = days == null ? 0 : days <= 7 ? 40 : days <= 14 ? 30 : days <= 30 ? 20 : days <= 60 ? 10 : 0;
  const score = stageScore === 0 ? 0 : Math.min(100, stageScore + recency);
  const band: WarmthBand = score >= 75 ? "hot" : score >= 55 ? "warm" : score >= 30 ? "cooling" : "cold";
  return { score, band, days, goingCold: ENGAGED.has(key) && (days == null || days > 21) };
}
