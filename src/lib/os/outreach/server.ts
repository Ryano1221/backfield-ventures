import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { readDoc, writeDoc } from "../doc-store";
import { readKnownIndex, readLeads, LEADS_DOC } from "../leads/server";
import { knownFor } from "../leads/known";
import { aiReady } from "../leads/ai";
import { FindymailError, findymailKey, verifyEmail } from "../leads/findymail";
import { sessionSecret } from "../session";
import { fixturesAllowed } from "../store";
import { aiSteps } from "./ai-steps";
import { logEvent, makeEnrollment, mergeRun, parseOutreach } from "./book";
import { LP_FORBIDDEN, pickVariant, replySubject, suppressed } from "./plan";
import { runOutreach, type Mailer } from "./engine";
import { accessToken, bouncedAddresses, googleApp, messageText, sendMail, threadReply } from "./gmail";
import { triageReply } from "./reply-ai";
import type { OutreachBook } from "./types";

export const OUTREACH_DOC = "outreach";
const AUTH_DOC = "gmail-auth";
const OUTBOX_DOC = "outreach-outbox";

export async function readOutreach(): Promise<OutreachBook> {
  return parseOutreach(await readDoc(OUTREACH_DOC).catch(() => null));
}

// The Gmail refresh token is a lasting key to Ryan's mailbox: stored encrypted
// with a key derived from the session secret, never in plain text.
function key(): Buffer {
  const secret = sessionSecret();
  if (!secret) throw new Error("OS_SESSION_SECRET is not set");
  return createHash("sha256").update(`gmail-auth:${secret}`).digest();
}

export function seal(text: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), body].map((part) => part.toString("base64url")).join(".");
}

export function unseal(sealed: string): string | null {
  try {
    const [iv, tag, body] = sealed.split(".").map((part) => Buffer.from(part, "base64url"));
    const decipher = createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export type GmailLink = { email: string; connected_at: string; token: string };

export async function readGmail(): Promise<{ email: string; connected_at: string; refreshToken: string } | null> {
  if (fixturesAllowed()) return { email: "owner@example.com", connected_at: "2026-11-01T00:00:00.000Z", refreshToken: "fixture" };
  const raw = await readDoc(AUTH_DOC).catch(() => null);
  if (!raw) return null;
  try {
    const link = JSON.parse(raw) as GmailLink;
    const refreshToken = unseal(link.token);
    return refreshToken ? { email: link.email, connected_at: link.connected_at, refreshToken } : null;
  } catch {
    return null;
  }
}

export async function saveGmail(email: string, refreshToken: string): Promise<void> {
  const link: GmailLink = { email, connected_at: new Date().toISOString(), token: seal(refreshToken) };
  await writeDoc(AUTH_DOC, JSON.stringify(link));
}

export async function forgetGmail(): Promise<void> {
  await writeDoc(AUTH_DOC, JSON.stringify({}));
}

/** Findymail checks each address before its first email; null when it can't (no key, no credits). */
function findymailVerifier(): ((email: string) => Promise<boolean | null>) | null {
  const key = findymailKey();
  if (!key || fixturesAllowed()) return null;
  let out = false;
  return async (email) => {
    if (out) return null;
    try {
      return await verifyEmail(fetch, key, email);
    } catch (error) {
      if (error instanceof FindymailError && error.stop) out = true;
      return null;
    }
  };
}

const SENDER_NAME = process.env.OUTREACH_FROM_NAME?.trim() || "Ryan Arnold";

/** Test and preview servers "send" into a local outbox, never Gmail. */
function fixtureMailer(): Mailer {
  return {
    me: { email: "owner@example.com", name: SENDER_NAME },
    send: async (mail, threadId) => {
      const box = JSON.parse((await readDoc(OUTBOX_DOC).catch(() => null)) || "[]") as unknown[];
      box.push({ ...mail, threadId });
      await writeDoc(OUTBOX_DOC, JSON.stringify(box));
      return { gmailId: `fixture-${box.length}`, threadId: threadId ?? `fixture-thread-${mail.to}`, messageId: `<fixture-${box.length}@example.com>` };
    },
    reply: async () => ({ replied: false, snippet: "" }),
    bounces: async () => [],
  };
}

async function liveMailer(): Promise<Mailer | null> {
  if (fixturesAllowed()) return fixtureMailer();
  const app = googleApp();
  const link = await readGmail();
  if (!app || !link) return null;
  const token = await accessToken(fetch, app, link.refreshToken);
  return {
    me: { email: link.email, name: SENDER_NAME },
    send: (mail, threadId) => sendMail(fetch, token, { ...mail, from: link.email, fromName: SENDER_NAME }, threadId),
    reply: (threadId) => threadReply(fetch, token, threadId, link.email),
    readReply: (messageId) => messageText(fetch, token, messageId),
    bounces: () => bouncedAddresses(fetch, token),
  };
}

/** One autopilot pass, saved. `budgetMs` is how long the host lets the request run. */
export async function runAndSave(budgetMs: number) {
  const started = Date.now();
  const [book, leads, known] = await Promise.all([readOutreach(), readLeads(), readKnownIndex()]);
  let mailer: Mailer | null = null;
  let note: string | null = null;
  try {
    mailer = await liveMailer();
  } catch (error) {
    note = `Gmail connection failed: ${error instanceof Error ? error.message : "unknown"}. Reconnect Gmail on the Leads page.`;
  }
  const result = await runOutreach(book, leads, {
    mailer,
    now: () => (fixturesAllowed() && process.env.OUTREACH_FIXTURE_NOW ? new Date(process.env.OUTREACH_FIXTURE_NOW) : new Date()),
    pause: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    timeLeft: () => budgetMs - (Date.now() - started),
    aiSteps: aiReady() && !fixturesAllowed() ? aiSteps : null,
    // 15 to 35 seconds apart, so a batch looks like a person sending, not a blast.
    spacingMs: () => (fixturesAllowed() ? 0 : 15_000 + Math.floor(Math.random() * 20_000)),
    maxSendsPerRun: 12,
    researchReady: aiReady() && !fixturesAllowed(),
    isKnown: (lead) => Boolean(knownFor(lead, known)),
    triage: aiReady() && !fixturesAllowed() ? (enrollment, text, calendarUrl) => triageReply(enrollment, text, calendarUrl) : null,
    verify: findymailVerifier(),
  });
  // Ryan may have changed things while this ran (switched autopilot off, stopped a sequence,
  // the lead search may have added leads). Merge onto the latest saves instead of overwriting them.
  const [freshBook, freshLeads] = await Promise.all([readOutreach(), readLeads()]);
  const saved = { ...mergeRun(book, freshBook, result.book), last_cron_at: new Date().toISOString() };
  const contacted = new Map(result.leads.leads.filter((lead) => lead.status === "contacted").map((lead) => [lead.id, lead]));
  const leadsSaved = { ...freshLeads, leads: freshLeads.leads.map((lead) => ((lead.status === "new" || lead.status === "approved") && contacted.has(lead.id) ? { ...lead, status: "contacted" as const, to: contacted.get(lead.id)!.to, updated_at: contacted.get(lead.id)!.updated_at } : lead)) };
  await writeDoc(OUTREACH_DOC, JSON.stringify(saved));
  await writeDoc(LEADS_DOC, JSON.stringify(leadsSaved));
  return { ...result, book: saved, leads: leadsSaved, report: { ...result.report, note: note ?? result.report.note } };
}

export async function outreachSetup() {
  const link = await readGmail();
  return { gmail: link ? link.email : null, googleReady: fixturesAllowed() || Boolean(googleApp()) };
}

/**
 * Ryan's "Send now": the first email goes out right away from his Gmail and the
 * sequence starts, follow-ups on schedule. Still checks do-not-contact and, when
 * Findymail is set up, that the address accepts mail.
 */
export async function sendNow(leadId: string, to: string): Promise<{ ok: true; book: OutreachBook } | { ok: false; error: string }> {
  const [book, leads] = await Promise.all([readOutreach(), readLeads()]);
  const lead = leads.leads.find((l) => l.id === leadId);
  if (!lead) return { ok: false, error: "That lead is not on the list." };
  const email = to.trim().toLowerCase();
  if (!/^[^@\s,;<>]+@[^@\s,;<>]+\.[a-z]{2,}$/i.test(email)) return { ok: false, error: "Pick or type an email address first." };
  if (suppressed(book, email)) return { ok: false, error: "That address asked not to be contacted, or bounced." };
  if (book.enrollments.some((e) => e.email === email && e.status === "active" && e.steps[0]?.sent_at)) return { ok: false, error: "That person already got the first email." };
  let mailer: Mailer | null;
  try {
    mailer = await liveMailer();
  } catch (error) {
    return { ok: false, error: `Gmail connection failed: ${error instanceof Error ? error.message : "unknown"}. Reconnect Gmail.` };
  }
  if (!mailer) return { ok: false, error: "Connect Gmail first, in the Autopilot panel's Settings." };
  const verify = findymailVerifier();
  if (verify && (await verify(email)) === false) return { ok: false, error: `Findymail says ${email} doesn't accept mail. Not sent.` };
  const now = new Date().toISOString();
  const enrollment = makeEnrollment({ ...lead, to: email }, email, "you", now, null, pickVariant(book, lead.kind));
  const step = enrollment.steps[0];
  if (enrollment.kind === "lp" && LP_FORBIDDEN.test(`${step.subject} ${step.body}`)) return { ok: false, error: "LP emails can't mention the fund. Edit the draft first." };
  try {
    const sent = await mailer.send({ to: email, toName: enrollment.name, subject: step.subject, body: step.body, inReplyTo: null }, null);
    Object.assign(step, { sent_at: now, gmail_id: sent.gmailId, message_id: sent.messageId });
    enrollment.thread_id = sent.threadId;
    enrollment.reason = "Sent now by you.";
  } catch (error) {
    return { ok: false, error: `Gmail didn't send it: ${error instanceof Error ? error.message : "unknown"}` };
  }
  // Save onto the latest state: the new sequence, and the lead marked contacted.
  const latest = await readOutreach();
  const saved = logEvent({ ...latest, enrollments: [...latest.enrollments.filter((e) => e.lead_id !== lead.id), enrollment] }, { at: now, lead_id: lead.id, text: `${lead.company}: email 1 sent now by you to ${email}.` });
  const freshLeads = await readLeads();
  await writeDoc(OUTREACH_DOC, JSON.stringify(saved));
  await writeDoc(LEADS_DOC, JSON.stringify({ ...freshLeads, leads: freshLeads.leads.map((l) => (l.id === lead.id ? { ...l, status: "contacted" as const, to: email, updated_at: now } : l)) }));
  return { ok: true, book: saved };
}

/**
 * Ryan's answer to someone who replied: sent from his Gmail in the same thread,
 * then the reply is marked handled. Only on his click.
 */
export async function replyNow(leadId: string, text: string): Promise<{ ok: true; book: OutreachBook } | { ok: false; error: string }> {
  const body = text.trim();
  if (!body) return { ok: false, error: "Write the answer first." };
  if (body.length > 5000) return { ok: false, error: "That answer is too long for a reply. Keep it under 5,000 characters." };
  const book = await readOutreach();
  const enrollment = book.enrollments.find((e) => e.lead_id === leadId && e.status === "replied" && e.reply);
  if (!enrollment) return { ok: false, error: "That reply is not waiting anymore." };
  if (!enrollment.thread_id) return { ok: false, error: "No Gmail thread for this one. Answer it in Gmail." };
  if (suppressed(book, enrollment.email)) return { ok: false, error: "That address asked not to be contacted." };
  if (enrollment.kind === "lp" && LP_FORBIDDEN.test(body)) return { ok: false, error: "LP emails can't mention the fund. Edit the answer first." };
  const sent = enrollment.steps.filter((s) => s.sent_at);
  const last = sent[sent.length - 1];
  if (!last) return { ok: false, error: "No email went out in this thread yet." };
  let mailer: Mailer | null;
  try {
    mailer = await liveMailer();
  } catch (error) {
    return { ok: false, error: `Gmail connection failed: ${error instanceof Error ? error.message : "unknown"}. Reconnect Gmail.` };
  }
  if (!mailer) return { ok: false, error: "Connect Gmail first, in the Autopilot panel's Settings." };
  try {
    await mailer.send({ to: enrollment.email, toName: enrollment.name, subject: replySubject(last.subject), body, inReplyTo: last.message_id ?? null }, enrollment.thread_id);
  } catch (error) {
    return { ok: false, error: `Gmail didn't send it: ${error instanceof Error ? error.message : "unknown"}` };
  }
  const now = new Date().toISOString();
  const latest = await readOutreach();
  const saved = logEvent(
    { ...latest, enrollments: latest.enrollments.map((e) => (e.lead_id === leadId && e.reply ? { ...e, reply: { ...e.reply, handled_at: now }, updated_at: now } : e)) },
    { at: now, lead_id: leadId, text: `${enrollment.company}: you answered ${enrollment.email} from Leads.` },
  );
  await writeDoc(OUTREACH_DOC, JSON.stringify(saved));
  return { ok: true, book: saved };
}
