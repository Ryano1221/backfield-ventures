import { readFileSync } from "node:fs";
import { join } from "node:path";

// Locked subscriber HTML from Ryan. The Backfield Ventures logo is the data URI on the img in this file.
const ROSTER_HTML = readFileSync(join(process.cwd(), "src/lib/handoff-roster-email.html"), "utf8");

const LOGO_RE =
  /<img src="data:image\/png;base64,[A-Za-z0-9+/=]+" width="176" alt="Backfield Ventures" style="width:176px;max-width:60%;height:auto;">/;

function logoTag(html: string) {
  const match = html.match(LOGO_RE);
  if (!match) throw new Error("handoff email missing Backfield Ventures logo");
  return match[0];
}

const SOURCE_LOGO = logoTag(ROSTER_HTML);

function withLockedLogo(html: string) {
  if (logoTag(html) !== SOURCE_LOGO) {
    throw new Error("handoff email logo does not match the locked HTML");
  }
  return html;
}

function replaceOnce(html: string, from: string, to: string) {
  const parts = html.split(from);
  if (parts.length !== 2) {
    throw new Error("locked roster HTML no longer matches the expected copy");
  }
  return parts[0] + to + parts[1];
}

function replaceSpan(html: string, start: string, end: string, replacement: string) {
  const startAt = html.indexOf(start);
  const endAt = startAt < 0 ? -1 : html.indexOf(end, startAt);
  if (startAt < 0 || endAt < 0) {
    throw new Error("locked roster HTML no longer matches the expected copy");
  }
  return html.slice(0, startAt) + replacement + html.slice(endAt + end.length);
}

const GREETING = ">Ryan,</p>";
const LOCKED_LINE = "Brands we think are impressive. Not an investment offer.";
const HANDOFF_URL = "https://www.backfieldventures.com/handoff";

export const HANDOFF_CONFIRMATION_SUBJECT = "You're on the roster.";
export const HANDOFF_FROM = "The Handoff <pitches@info.backfieldventures.com>";

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cleanLine(value: string) {
  return value.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

export function renderHandoffConfirmation(name: string) {
  const safeName = escapeHtml(cleanLine(name));
  return withLockedLogo(replaceOnce(ROSTER_HTML, GREETING, `>${safeName},</p>`));
}

export function handoffConfirmationText(name: string) {
  return [
    `${cleanLine(name)},`,
    "",
    "Welcome to The Handoff, the monthly newsletter from Backfield Ventures.",
    "",
    "In football, a quarterback hands the ball to a running back. Here, we hand our research to you: the sports and consumer brands we're watching, why they stand out, and the signals we think others might miss.",
    "",
    "One useful read each month.",
    "Your first handoff is coming soon.",
    "",
    LOCKED_LINE,
    "",
    HANDOFF_URL,
  ].join("\n");
}

export function renderHandoffNotice(d: { name: string; email: string; source: string }) {
  const safeName = escapeHtml(cleanLine(d.name));
  const email = cleanLine(d.email);
  const safeEmail = escapeHtml(email);
  const emailHtml = `<a href="mailto:${encodeURIComponent(email)}" style="color:#b7b7b7;text-decoration:underline;">${safeEmail}</a>`;

  let html = ROSTER_HTML;
  html = replaceOnce(
    html,
    "<title>You're on the roster | The Handoff</title>",
    "<title>Someone joined | The Handoff</title>",
  );
  html = replaceOnce(
    html,
    "From our backfield to your inbox. The brands and insights we are watching, handed off monthly.",
    `${safeName} joined The Handoff.`,
  );
  html = replaceOnce(html, ">FROM OUR BACKFIELD TO YOUR INBOX.</p>", ">INTERNAL</p>");
  html = replaceOnce(html, ">You're on the roster.</h1>", ">Someone joined.</h1>");
  html = replaceSpan(
    html,
    '<p class="body-copy" style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:1.5;color:#f4f1ea;">',
    "might miss.</p>",
    `<p class="body-copy" style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:1.5;color:#f4f1ea;">Someone joined The Handoff.</p>`,
  );
  html = replaceSpan(
    html,
    '<p style="margin:0 0 7px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;font-weight:700;color:#f4f1ea;">',
    "Your first handoff is coming soon.</p>",
    `<p style="margin:0 0 7px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;font-weight:700;color:#f4f1ea;">Name</p>
<p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#b7b7b7;">${safeName}</p>
<p style="margin:0 0 7px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;font-weight:700;color:#f4f1ea;">Email</p>
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#b7b7b7;">${emailHtml}</p>`,
  );
  return withLockedLogo(html);
}

export function handoffNoticeText(d: { name: string; email: string; source: string }) {
  return [
    "Someone joined The Handoff.",
    "",
    "Name",
    cleanLine(d.name),
    "",
    "Email",
    cleanLine(d.email),
    "",
    LOCKED_LINE,
    "",
    HANDOFF_URL,
  ].join("\n");
}
