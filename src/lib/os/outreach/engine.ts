/**
 * One pass of autopilot, run every hour on weekday mornings:
 *   1. check every live thread for a reply, and Gmail for bounces; stop those sequences
 *   2. pause itself if too many bounce
 *   3. start sequences for new leads at or above the score bar (up to today's cap)
 *   4. send what's due, in each person's Tuesday to Thursday morning, spaced out
 * Replies and bounces are checked even while autopilot is off.
 */
import type { Lead, LeadBook } from "../leads/types";
import { logEvent, makeEnrollment } from "./book";
import { autoAddress, autoEligible, dailyCap, firstTouchesToday, inSendWindow, isOptOut, LP_FORBIDDEN, nextStep, shouldPause } from "./plan";
import type { Enrollment, OutreachBook, Step } from "./types";

export type Mailer = {
  me: { email: string; name: string };
  send: (mail: { to: string; toName: string | null; subject: string; body: string; inReplyTo: string | null }, threadId: string | null) => Promise<{ gmailId: string; threadId: string; messageId: string | null }>;
  reply: (threadId: string) => Promise<{ replied: boolean; snippet: string }>;
  bounces: () => Promise<string[]>;
};

export type EngineDeps = {
  mailer: Mailer | null;
  now: () => Date;
  pause: (ms: number) => Promise<void>;
  timeLeft: () => number;
  /** Writes all five steps for a lead; null keeps the templates. */
  aiSteps: ((lead: Lead) => Promise<{ subject: string; body: string }[] | null>) | null;
  /** Wait between two sends, so a batch doesn't leave all at once. */
  spacingMs: () => number;
  maxSendsPerRun: number;
  /** True when leads get researched; autopilot then waits for the research before starting. */
  researchReady?: boolean;
};

export type EngineReport = { checked: number; replied: number; bounced: number; enrolled: number; sent: number; errors: string[]; note: string | null };

export async function runOutreach(book: OutreachBook, leads: LeadBook, deps: EngineDeps): Promise<{ book: OutreachBook; leads: LeadBook; report: EngineReport }> {
  const report: EngineReport = { checked: 0, replied: 0, bounced: 0, enrolled: 0, sent: 0, errors: [], note: null };
  if (!deps.mailer) return { book, leads, report: { ...report, note: "Gmail is not connected." } };
  const mailer = deps.mailer;
  let out = { ...book, enrollments: book.enrollments.map((e) => ({ ...e, steps: e.steps.map((s) => ({ ...s })) })) };
  let leadList = leads.leads.map((lead) => ({ ...lead }));
  const at = () => deps.now().toISOString();

  const finish = (enrollment: Enrollment, status: Enrollment["status"], reason: string, suppressEmail: boolean) => {
    enrollment.status = status;
    enrollment.reason = reason;
    enrollment.updated_at = at();
    if (suppressEmail) out.suppress = [...new Set([...out.suppress, enrollment.email])];
    out = logEvent(out, { at: at(), lead_id: enrollment.lead_id, text: `${enrollment.company}: ${reason}` });
  };

  // 1. Replies and bounces.
  for (const enrollment of out.enrollments) {
    if (enrollment.status !== "active" || !enrollment.thread_id || deps.timeLeft() < 30_000) continue;
    report.checked++;
    try {
      const reply = await mailer.reply(enrollment.thread_id);
      if (!reply.replied) continue;
      report.replied++;
      if (isOptOut(reply.snippet)) finish(enrollment, "opted_out", "Asked not to be contacted. Will never be emailed again.", true);
      else finish(enrollment, "replied", "Replied. Sequence stopped; it's in your inbox.", false);
    } catch (error) {
      report.errors.push(`${enrollment.company}: ${error instanceof Error ? error.message : "could not check the thread"}`);
    }
  }
  try {
    const bounced = new Set(await mailer.bounces());
    for (const enrollment of out.enrollments) {
      if (!bounced.has(enrollment.email) || enrollment.status === "bounced" || !enrollment.steps.some((s) => s.sent_at)) continue;
      report.bounced++;
      finish(enrollment, "bounced", `Bounced: ${enrollment.email} doesn't exist.`, true);
    }
  } catch (error) {
    report.errors.push(`Bounce check: ${error instanceof Error ? error.message : "failed"}`);
  }

  // 2. Too many bounces: stop sending until Ryan looks.
  const pause = out.settings.enabled ? shouldPause(out, deps.now()) : null;
  if (pause) {
    out = logEvent({ ...out, settings: { ...out.settings, enabled: false, paused_reason: pause } }, { at: at(), lead_id: null, text: pause });
    report.note = pause;
  }
  if (!out.settings.enabled) return { book: out, leads: { ...leads, leads: leadList }, report: { ...report, note: report.note ?? "Autopilot is off. Checked replies only." } };

  // 3. Start sequences for the best new leads, never more waiting than today's cap.
  const cap = dailyCap(out.settings, out, deps.now());
  const waiting = () => out.enrollments.filter((e) => e.status === "active" && !e.steps[0]?.sent_at).length;
  const room = () => cap - firstTouchesToday(out, deps.now()) - waiting();
  for (const lead of [...leadList].sort((a, b) => b.score - a.score)) {
    if (room() <= 0 || deps.timeLeft() < 60_000) break;
    if (!autoEligible(lead, out, deps.researchReady)) continue;
    const email = autoAddress(lead)!;
    const ai = deps.aiSteps ? await deps.aiSteps(lead).catch(() => null) : null;
    out.enrollments.push(makeEnrollment({ ...lead, to: email }, email, "auto", at(), ai));
    out = logEvent(out, { at: at(), lead_id: lead.id, text: `${lead.company}: sequence started automatically (score ${lead.score}).` });
    report.enrolled++;
  }

  // 4. Send what's due. Follow-ups first; first emails within today's cap.
  const due: { enrollment: Enrollment; step: Step }[] = [];
  for (const enrollment of out.enrollments) {
    const step = nextStep(enrollment, deps.now());
    if (step && inSendWindow(deps.now(), enrollment.tz)) due.push({ enrollment, step });
  }
  due.sort((a, b) => Number(a.step.n === 1) - Number(b.step.n === 1));
  for (const { enrollment, step } of due) {
    if (report.sent >= deps.maxSendsPerRun || deps.timeLeft() < 45_000) break;
    if (step.n === 1 && firstTouchesToday(out, deps.now()) >= cap) continue;
    if (out.suppress.includes(enrollment.email)) {
      finish(enrollment, "stopped", "Address is on the do-not-contact list.", false);
      continue;
    }
    if (enrollment.kind === "lp" && LP_FORBIDDEN.test(`${step.subject} ${step.body}`)) {
      finish(enrollment, "stopped", "Held back: an LP email mentioned the fund. Edit it before restarting.", false);
      continue;
    }
    if (report.sent > 0) await deps.pause(deps.spacingMs());
    const previous = enrollment.steps.filter((s) => s.sent_at).at(-1);
    try {
      const result = await mailer.send(
        { to: enrollment.email, toName: enrollment.name, subject: step.subject, body: step.body, inReplyTo: step.new_thread ? null : previous?.message_id ?? null },
        step.new_thread ? null : enrollment.thread_id,
      );
      step.sent_at = at();
      step.gmail_id = result.gmailId;
      step.message_id = result.messageId;
      enrollment.thread_id = result.threadId;
      enrollment.updated_at = at();
      report.sent++;
      out = logEvent(out, { at: at(), lead_id: enrollment.lead_id, text: `${enrollment.company}: email ${step.n} of ${enrollment.steps.length} sent to ${enrollment.email}.` });
      if (step.n === 1) leadList = leadList.map((lead) => (lead.id === enrollment.lead_id ? { ...lead, status: "contacted", to: enrollment.email, updated_at: at() } : lead));
      if (enrollment.steps.every((s) => s.sent_at)) finish(enrollment, "finished", "All emails sent, no reply.", false);
    } catch (error) {
      report.errors.push(`${enrollment.company}: ${error instanceof Error ? error.message : "send failed"}`);
      // A broken connection fails every send the same way; stop trying this run.
      if (error && typeof error === "object" && "reconnect" in error && (error as { reconnect: boolean }).reconnect) break;
    }
  }
  return { book: out, leads: { ...leads, leads: leadList }, report };
}
