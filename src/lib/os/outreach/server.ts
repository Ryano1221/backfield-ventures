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
import { mergeRun, parseOutreach } from "./book";
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
    triage: aiReady() && !fixturesAllowed() ? triageReply : null,
    verify: findymailVerifier(),
  });
  // Ryan may have changed things while this ran (switched autopilot off, stopped a sequence,
  // the lead search may have added leads). Merge onto the latest saves instead of overwriting them.
  const [freshBook, freshLeads] = await Promise.all([readOutreach(), readLeads()]);
  const saved = mergeRun(book, freshBook, result.book);
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
