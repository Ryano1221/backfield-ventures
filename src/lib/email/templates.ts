import {
  ADDRESS,
  DISCLAIMER,
  HANDOFF_CLOSING,
  HANDOFF_FROM,
  HANDOFF_REPLY_TO,
  SAMPLE_UNSUB_URL,
  WHY_HANDOFF,
} from "./copy";
import { textToHtml } from "./format";
import { BEST3_TEXT, HANDOFF_TEXT } from "./template-text";

export const HANDOFF_SUBJECT = "The Handoff, Issue 01: Sample Brand A, Sample Brand B and Sample Brand C";
export const BEST3_SUBJECT = "Three companies worth a look (Sample Month 2026)";
export const BEST3_FROM = "Ryan Arnold <ryan@backfieldventures.com>";
export const WELCOME_SUBJECT = "Welcome to The Handoff";
export const WELCOME_PREVIEW = "One note a month on brands I think are impressive.";
export const DELIVERY_SUBJECT = "Your copy of the sample list";

const PREFERENCES_URL = "https://backfieldventures.com/p/SAMPLE-TOKEN";

function footer(why: string, viewUrl: string): string {
  return [
    DISCLAIMER,
    "",
    why,
    "",
    "Ryan Arnold",
    "Backfield Ventures",
    ADDRESS,
    "",
    `Unsubscribe: ${SAMPLE_UNSUB_URL}`,
    `Update preferences: ${PREFERENCES_URL}`,
    `View in browser: ${viewUrl}`,
  ].join("\n");
}

export const WELCOME_TEXT = [
  "Hi {{first_name|there}},",
  "",
  "Thanks for signing up for The Handoff. Once a month I write about a few consumer and sports brands I think are impressive, and why.",
  "",
  "The next issue lands in your inbox when it's ready. If you ever want to tell me about a brand, just reply. It comes straight to me.",
  "",
  "Ryan",
  "",
  footer(
    "You're getting this because you signed up for The Handoff at backfieldventures.com.",
    "https://backfieldventures.com/handoff/welcome",
  ),
].join("\n");

export const DELIVERY_TEXT = [
  "Hi {{first_name|there}}, here's the list you asked for. The link stays live, and the CSV is attached.",
  "",
  footer(
    "You're getting this because you asked for this list on backfieldventures.com.",
    "https://backfieldventures.com/lists/sample-list",
  ),
].join("\n");

export const HANDOFF_HTML = textToHtml(HANDOFF_TEXT, "Issue 01. One line that says what's inside.");
export const BEST3_HTML = textToHtml(BEST3_TEXT);
export const WELCOME_HTML = textToHtml(WELCOME_TEXT, WELCOME_PREVIEW);
export const DELIVERY_HTML = textToHtml(DELIVERY_TEXT);

export type DraftGroup = "Drafts" | "Automatic";

export type EmailDraft = {
  id: string;
  name: string;
  detail: string;
  group: DraftGroup;
  state: string;
  subject: string;
  from: string;
  replyTo: string;
  text: string;
  html: string;
  enabled: boolean;
  requireIssue: boolean;
  listLabel: string;
  channel: "handoff" | "gmail";
};

export const DRAFTS: EmailDraft[] = [
  {
    id: "issue-01",
    name: "Issue 01",
    detail: "Sample Brand A, Sample Brand B and Sample Brand C",
    group: "Drafts",
    state: "Draft",
    subject: HANDOFF_SUBJECT,
    from: HANDOFF_FROM,
    replyTo: HANDOFF_REPLY_TO,
    text: HANDOFF_TEXT,
    html: HANDOFF_HTML,
    enabled: true,
    requireIssue: true,
    listLabel: "The Handoff",
    channel: "handoff",
  },
  {
    id: "welcome",
    name: "Welcome email",
    detail: "Goes out once, right after someone signs up",
    group: "Automatic",
    state: "Draft",
    subject: WELCOME_SUBJECT,
    from: HANDOFF_FROM,
    replyTo: HANDOFF_REPLY_TO,
    text: WELCOME_TEXT,
    html: WELCOME_HTML,
    enabled: false,
    requireIssue: false,
    listLabel: "The Handoff",
    channel: "handoff",
  },
  {
    id: "list-delivery",
    name: "List delivery",
    detail: "Sends the list someone asked for",
    group: "Automatic",
    state: "Draft",
    subject: DELIVERY_SUBJECT,
    from: HANDOFF_FROM,
    replyTo: HANDOFF_REPLY_TO,
    text: DELIVERY_TEXT,
    html: DELIVERY_HTML,
    enabled: false,
    requireIssue: false,
    listLabel: "Sample List",
    channel: "handoff",
  },
];

export const BEST3_DRAFT: EmailDraft = {
  id: "best-3",
  name: "Best 3",
  detail: "One note per person, sent from the mail client",
  group: "Drafts",
  state: "Draft",
  subject: BEST3_SUBJECT,
  from: BEST3_FROM,
  replyTo: HANDOFF_REPLY_TO,
  text: BEST3_TEXT,
  html: BEST3_HTML,
  enabled: false,
  requireIssue: false,
  listLabel: "Best 3",
  channel: "gmail",
};

export function getDraft(id: string): EmailDraft | null {
  if (id === BEST3_DRAFT.id) return BEST3_DRAFT;
  return DRAFTS.find((draft) => draft.id === id) ?? null;
}

export function handoffClosingPresent(text: string): boolean {
  return text.includes(HANDOFF_CLOSING);
}

export { HANDOFF_TEXT, BEST3_TEXT, WHY_HANDOFF };
