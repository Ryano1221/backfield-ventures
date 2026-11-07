/**
 * The pure parts of outreach: which steps each kind gets, when a step is due,
 * whether it's a good moment in the recipient's time zone, and how many new
 * people may be emailed today.
 */
import { plainName } from "../leads/draft";
import type { Lead, LeadKind } from "../leads/types";
import type { Enrollment, OutreachBook, OutreachSettings, Step, StepKind } from "./types";

export const HANDOFF_URL = "backfieldventures.com/handoff";
export const OPT_OUT = `If you'd rather I not reach out, just reply "no thanks" and I won't email again.`;

/** Apollo's cadence: day 0, +3, +7, +7, then a check-in about three months later. */
export const CADENCE: { kind: StepKind; gap_days: number; new_thread: boolean }[] = [
  { kind: "first", gap_days: 0, new_thread: true },
  { kind: "value", gap_days: 3, new_thread: false },
  { kind: "angle", gap_days: 7, new_thread: false },
  { kind: "breakup", gap_days: 7, new_thread: false },
  { kind: "nurture", gap_days: 90, new_thread: true },
];

/** Words an LP email must never use: these notes are about startups and The Handoff, not the fund. */
export const LP_FORBIDDEN = /\b(fund|funds|fundraise|fundraising|raising capital|commitment|commit|LPs?|limited partner|returns|carry|allocation|capital call|invest with us|invest in us|minimum check)\b/i;

const first = (name: string | null) => (name ?? "").split(/\s+/)[0] || "there";

/** The plain-template version of every step. The AI version replaces these when it is on. */
export function templateSteps(kind: LeadKind, company: string, name: string | null, firstEmail: { subject: string; body: string } | null): { subject: string; body: string }[] {
  const hi = `Hi ${first(name)},`;
  const co = plainName(company);
  const sign = "Best,\nRyan";
  const join = (...parts: string[]) => parts.join("\n\n");
  if (kind === "lp") {
    return [
      {
        subject: "Startups worth knowing about",
        body: join(hi, `I'm Ryan, I run Backfield Ventures in Austin. Each month I write The Handoff, a short note on early consumer brands I think are impressive and why.`, `A lot of readers just like seeing what's being built early. Want me to add you? Here's the page: ${HANDOFF_URL}`, sign),
      },
      { subject: "", body: join(hi, `Following up in case this got buried. If you're curious about early-stage startups, The Handoff is the easiest way to see what I'm seeing: ${HANDOFF_URL}`, `Would that be useful?`, sign) },
      { subject: "", body: join(hi, `Different idea: if you ever want to learn how early consumer startups get built, I'm happy to grab coffee or a call and walk through a few I've looked at recently.`, `Open to that sometime?`, sign) },
      { subject: "", body: join(hi, `I don't want to crowd your inbox, so this is my last note for now. If you ever want to talk startups, just reply here.`, sign) },
      { subject: "A few startups you might like", body: join(hi, `Checking back in. I've come across a few consumer startups lately you might find interesting. Happy to share them, or add you to The Handoff: ${HANDOFF_URL}`, `Want me to send a couple over?`, sign) },
    ];
  }
  if (kind === "partner") {
    return [
      firstEmail ?? { subject: "Swapping deals", body: join(hi, `I run Backfield Ventures in Austin, focused on early consumer brands. Want to swap deals?`, sign) },
      { subject: "", body: join(hi, `Quick follow up. Here's the kind of note I mean, The Handoff, where I share consumer brands I like each month: ${HANDOFF_URL}`, `If you see consumer deals that aren't a fit for you, I'm always glad to take a look. Want to swap a few?`, sign) },
      { subject: "", body: join(hi, `One more idea: we're both seeing early deals, and co-investing on the right one can make both checks better. We focus on consumer brands.`, `What's your sweet spot right now?`, sign) },
      { subject: "", body: join(hi, `I don't want to crowd your inbox, so this is my last note for now. If swapping deals ever makes sense, just reply here.`, sign) },
      { subject: `${co}, checking back in`, body: join(hi, `It's been a few months, so checking back in. Seeing anything good in consumer lately?`, `I've got a few I'd be glad to share. Want to trade notes?`, sign) },
    ];
  }
  return [
    firstEmail ?? { subject: `${co} + Backfield Ventures`, body: join(hi, `I came across ${co}. I run Backfield Ventures in Austin and back early consumer brands. Open to a quick call?`, sign) },
    { subject: "", body: join(hi, `Following up with something that might be useful. I write The Handoff, a short monthly note on consumer brands I think are doing it right: ${HANDOFF_URL}`, `Still keen to hear how ${co} is going. Open to a quick call this week or next?`, sign) },
    { subject: "", body: join(hi, `Different angle: beyond the check, we spend most of our time helping brands with retail buyers, distribution and setting up the next round. If any of that is on your plate at ${co}, happy to share what's worked.`, `Worth a 15-minute call?`, sign) },
    { subject: "", body: join(hi, `I don't want to crowd your inbox, so this is my last note for now. If the timing's better later on, just reply here and I'll pick it up.`, `Rooting for ${co}.`, sign) },
    { subject: `${co}, checking back in`, body: join(hi, `It's been a few months since I reached out, so checking back in. How's ${co} going?`, `If you're putting together the next round, I'd love to take a look.`, sign) },
  ];
}

/** Turns written steps into a schedule. Follow-ups in the thread reuse the first subject. */
export function buildSteps(written: { subject: string; body: string }[]): Step[] {
  const firstSubject = written[0]?.subject || "Hello";
  return CADENCE.map((slot, i) => {
    const step = written[i] ?? { subject: "", body: "" };
    return {
      n: i + 1,
      kind: slot.kind,
      gap_days: slot.gap_days,
      new_thread: slot.new_thread,
      subject: slot.new_thread ? step.subject || firstSubject : `Re: ${firstSubject}`,
      body: `${step.body.trim()}\n\n${OPT_OUT}`,
      sent_at: null,
      gmail_id: null,
      message_id: null,
    };
  }).filter((step) => step.body.trim() !== OPT_OUT);
}

const ZONES: Record<string, string> = {};
for (const state of "CT DE DC FL GA IN KY ME MD MA MI NH NJ NY NC OH PA RI SC VT VA WV PR".split(" ")) ZONES[state] = "America/New_York";
for (const state of "AL AR IL IA KS LA MN MS MO NE ND OK SD TN TX WI".split(" ")) ZONES[state] = "America/Chicago";
for (const state of "CO ID MT NM UT WY".split(" ")) ZONES[state] = "America/Denver";
ZONES.AZ = "America/Phoenix";
for (const state of "CA NV OR WA".split(" ")) ZONES[state] = "America/Los_Angeles";
ZONES.AK = "America/Anchorage";
ZONES.HI = "Pacific/Honolulu";

/** The lead's time zone from "City, ST". Ryan's own (Central) when unknown. */
export function zoneFor(location: string | null): string {
  const state = location?.match(/,\s*([A-Z]{2})\s*$/)?.[1];
  return (state && ZONES[state]) || "America/Chicago";
}

function local(now: Date, tz: string): { weekday: string; hour: number; date: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", hour: "numeric", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );
  return { weekday: parts.weekday, hour: Number(parts.hour), date: `${parts.year}-${parts.month}-${parts.day}` };
}

/** Tuesday to Thursday, 8 to 11 in the morning, their time. */
export function inSendWindow(now: Date, tz: string): boolean {
  const { weekday, hour } = local(now, tz);
  return ["Tue", "Wed", "Thu"].includes(weekday) && hour >= 8 && hour < 11;
}

/** The step to send next, or null. Due when its gap has passed since the step before. */
export function nextStep(enrollment: Enrollment, now: Date): Step | null {
  if (enrollment.status !== "active") return null;
  const index = enrollment.steps.findIndex((step) => !step.sent_at);
  if (index < 0) return null;
  const step = enrollment.steps[index];
  if (index === 0) return step;
  const previous = enrollment.steps[index - 1].sent_at;
  if (!previous) return null;
  // A day is counted from the previous send, less a little slack so the same morning slot still fits.
  const due = Date.parse(previous) + step.gap_days * 86_400_000 - 6 * 3_600_000;
  return now.getTime() >= due ? step : null;
}

const DAY_MS = 86_400_000;

/** First emails sent in the last day. */
export function firstTouchesToday(book: OutreachBook, now: Date): number {
  return book.enrollments.filter((e) => e.steps[0]?.sent_at && now.getTime() - Date.parse(e.steps[0].sent_at) < DAY_MS).length;
}

/** Bounces among first emails sent in the last 14 days. */
export function recentBounceRate(book: OutreachBook, now: Date): { sent: number; bounced: number } {
  const recent = book.enrollments.filter((e) => e.steps[0]?.sent_at && now.getTime() - Date.parse(e.steps[0].sent_at) < 14 * DAY_MS);
  return { sent: recent.length, bounced: recent.filter((e) => e.status === "bounced").length };
}

/** New people allowed today: the ramp, held at the start while bounces run above 3%. */
export function dailyCap(settings: OutreachSettings, book: OutreachBook, now: Date): number {
  const { sent, bounced } = recentBounceRate(book, now);
  if (sent >= 10 && bounced / sent > 0.03) return settings.start_cap;
  if (!settings.ramp_from) return settings.start_cap;
  const weeks = Math.max(0, Math.floor((now.getTime() - Date.parse(settings.ramp_from)) / (7 * DAY_MS)));
  return Math.min(settings.max_cap, settings.start_cap + weeks * settings.ramp_per_week);
}

/** More than 8% of recent first emails bouncing means bad addresses: autopilot stops itself. */
export function shouldPause(book: OutreachBook, now: Date): string | null {
  const { sent, bounced } = recentBounceRate(book, now);
  if (sent >= 10 && bounced / sent > 0.08) return `Paused: ${bounced} of the last ${sent} first emails bounced. Check the addresses, then switch autopilot back on.`;
  return null;
}

/** The best address for a lead, if it is safe to email without a person checking it. */
export function autoAddress(lead: Lead): string | null {
  if (lead.to) {
    const picked = lead.contacts.find((c) => c.email === lead.to);
    if (!picked || picked.confidence !== "low") return lead.to;
  }
  return lead.contacts.find((c) => c.confidence === "high" || c.confidence === "medium")?.email ?? null;
}

/** Leads that start a sequence on their own: new, at or above the bar, with a real address. */
export function autoEligible(lead: Lead, book: OutreachBook, researchReady = false): boolean {
  const s = book.settings;
  if (!s.enabled || !s.kinds[lead.kind] || lead.status !== "new" || lead.score < s.threshold) return false;
  // With research on, wait until the lead is researched so the first email can be personal.
  if (researchReady && lead.research === undefined) return false;
  const email = autoAddress(lead);
  if (!email || suppressed(book, email)) return false;
  return !book.enrollments.some((e) => e.lead_id === lead.id || e.email === email);
}

export function suppressed(book: OutreachBook, email: string): boolean {
  const lower = email.toLowerCase();
  const domain = lower.split("@")[1] ?? "";
  return book.suppress.some((entry) => entry === lower || entry === `@${domain}`);
}

/** Replies that mean "stop": opt-outs get suppressed for good, not just stopped. */
export function isOptOut(text: string): boolean {
  return /\b(no thanks|no thank you|unsubscribe|remove me|stop emailing|not interested|take me off|do not contact|don't contact|please stop)\b/i.test(text);
}

/** Replies Ryan hasn't dealt with yet, newest first. */
export function repliesWaiting(book: OutreachBook): Enrollment[] {
  return book.enrollments.filter((e) => e.status === "replied" && e.reply && !e.reply.handled_at).sort((a, b) => (b.reply?.at ?? "").localeCompare(a.reply?.at ?? ""));
}

/** Opens the thread in Gmail on the web. The API's thread id is the one Gmail's URLs use. */
export function gmailThreadUrl(threadId: string): string {
  return `https://mail.google.com/mail/u/0/#all/${encodeURIComponent(threadId)}`;
}

/** The last 30 days of autopilot, measured the way Apollo does: reply rate on people emailed. */
export function outreachStats(book: OutreachBook, now: Date): { emailed: number; replied: number; bounced: number; optedOut: number; replyRate: number | null } {
  const recent = book.enrollments.filter((e) => e.steps[0]?.sent_at && now.getTime() - Date.parse(e.steps[0].sent_at) < 30 * DAY_MS);
  const replied = recent.filter((e) => e.status === "replied").length;
  const bounced = recent.filter((e) => e.status === "bounced").length;
  const optedOut = recent.filter((e) => e.status === "opted_out").length;
  const delivered = recent.length - bounced;
  return { emailed: recent.length, replied, bounced, optedOut, replyRate: delivered >= 5 ? Math.round((replied / delivered) * 100) : null };
}
