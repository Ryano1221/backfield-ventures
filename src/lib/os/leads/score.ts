/**
 * Scores a lead 0 to 100 and says why, in plain words. Part of the score is
 * Ryan's own taste: words from deals he rated great or good push a lead up,
 * words from deals he rated no push it down.
 */
import { coreWords } from "./website";
import { researchPoints } from "./research";
import type { Lead } from "./types";

export type RatedPitch = { company: string; sector: string | null; summary?: string | null; title?: string | null; rating: "great" | "good" | "maybe" | "no" };
export type Taste = { weights: Map<string, number>; rated: number };

const STOP = new Set(["and", "the", "for", "with", "inc", "llc", "co", "company", "brand", "brands", "a", "of", "to", "in", "on", "by", "is", "its", "it", "that", "this", "from", "at", "an", "or", "as", "are", "be", "we", "our", "you", "your", "their"]);

const words = (text: string) => coreWords(text).filter((word) => word.length > 2 && !STOP.has(word));

/** Word weights from rated deals: +1 great, +0.5 good, -1 no. */
export function learnTaste(pitches: RatedPitch[]): Taste {
  const weights = new Map<string, number>();
  const value = { great: 1, good: 0.5, maybe: 0, no: -1 };
  let rated = 0;
  for (const pitch of pitches) {
    const v = value[pitch.rating];
    rated++;
    if (!v) continue;
    for (const word of new Set(words(`${pitch.company} ${pitch.sector ?? ""} ${pitch.title ?? ""} ${pitch.summary ?? ""}`))) {
      weights.set(word, (weights.get(word) ?? 0) + v);
    }
  }
  return { weights, rated };
}

function tasteOf(lead: Lead, taste: Taste): { points: number; liked: string[]; disliked: string[] } {
  const text = `${lead.company} ${lead.signals.map((s) => s.value).join(" ")} ${lead.note}`;
  let total = 0;
  const liked: string[] = [];
  const disliked: string[] = [];
  for (const word of new Set(words(text))) {
    const w = taste.weights.get(word);
    if (!w) continue;
    total += w;
    if (w > 0) liked.push(word);
    else disliked.push(word);
  }
  return { points: Math.max(-15, Math.min(15, Math.round(total * 5))), liked, disliked };
}

const money = (value: string | undefined) => {
  const match = value?.match(/\$([\d.]+)([MK])/);
  if (!match) return null;
  return Number(match[1]) * (match[2] === "M" ? 1_000_000 : 1_000);
};

const signal = (lead: Lead, label: string) => lead.signals.find((s) => s.label === label)?.value;

/** Ryan is in Austin. Texas deals and people are easier to meet. */
const HOME = /\b(TX|Texas)\b/;

export function scoreLead(lead: Lead, taste: Taste): { score: number; reasons: string[] } {
  let score = 40;
  const reasons: string[] = [];
  const add = (points: number, why: string) => {
    score += points;
    reasons.push(`${points > 0 ? "+" : ""}${points} ${why}`);
  };
  if (lead.kind === "founder") {
    const raising = money(signal(lead, "Raising"));
    if (raising != null && raising >= 250_000 && raising <= 5_000_000) add(15, "seed-size round");
    else if (raising != null && raising > 5_000_000) add(-10, "round is large for us");
    const inSoFar = signal(lead, "In so far")?.match(/\((\d+)%\)/)?.[1];
    if (inSoFar && Number(inSoFar) >= 25 && Number(inSoFar) < 100) add(10, `${inSoFar}% committed, still open`);
    if (inSoFar && Number(inSoFar) >= 100) add(-10, "round looks full");
    if (signal(lead, "Company age")) add(5, "under 5 years old");
    if (signal(lead, "Industry") === "Retailing" || signal(lead, "Industry") === "Restaurants") add(10, "consumer industry");
  } else if (lead.kind === "partner") {
    const vehicles = Number(signal(lead, "Vehicles filed") ?? 1);
    if (vehicles > 1) add(Math.min(20, vehicles * 4), `${vehicles} deals filed recently`);
    const size = money(signal(lead, "Vehicle size"));
    if (size != null && size <= 2_000_000) add(10, "angel-size checks");
    if (!lead.people.length) add(-10, "no named person in the filing");
  }
  if (lead.source === "Findymail") add(15, "on your Findymail list");
  if (lead.source === "Findymail search") add(10, "matched your Findymail search");
  if (lead.location && HOME.test(lead.location)) add(5, "in Texas");
  if (lead.website) add(5, "website found");
  const best = lead.contacts[0];
  if (best?.confidence === "high") add(15, "named contact found");
  else if (best?.confidence === "medium") add(8, "team inbox found");
  else if (!best) add(-10, "no contact yet");
  const warm = researchPoints(lead.research, lead.kind);
  if (warm.points && warm.why) add(warm.points, warm.why);
  if (taste.rated >= 5) {
    const t = tasteOf(lead, taste);
    if (t.points > 0) add(t.points, `like deals you rated well (${t.liked.slice(0, 3).join(", ")})`);
    if (t.points < 0) add(t.points, `like deals you passed on (${t.disliked.slice(0, 3).join(", ")})`);
  }
  return { score: Math.max(0, Math.min(100, score)), reasons };
}
