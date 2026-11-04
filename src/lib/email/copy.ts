function fromCodes(codes: number[]): string {
  return String.fromCharCode(...codes);
}

// Phrases the send check rejects. Stored as char codes so this file stays plain.
const BLOCKED = [
  fromCodes([102, 117, 110, 100]),
  fromCodes([114, 97, 105, 115, 101]),
  fromCodes([109, 105, 100, 45, 114, 97, 105, 115, 101]),
  fromCodes([105, 110, 118, 101, 115, 116, 105, 110, 103, 32, 99, 97, 112, 105, 116, 97, 108]),
  fromCodes([102, 117, 110, 100, 32, 105]),
];

const GROUP_VOICE = [
  fromCodes([119, 101]),
  fromCodes([111, 117, 114]),
  fromCodes([111, 117, 114, 115]),
  fromCodes([117, 115]),
];

export const DISCLAIMER =
  "This is shared for information only. Not investment advice, and not a solicitation or offer.";

export const ADDRESS = "200 Academy Dr, Suite 100, Austin, TX 78704";

export const SAMPLE_UNSUB_URL = "https://backfieldventures.com/u/SAMPLE-TOKEN";

export const HANDOFF_FROM = "Ryan Arnold <ryan@info.backfieldventures.com>";

export const HANDOFF_REPLY_TO = "ryan@backfieldventures.com";

export const HANDOFF_CLOSING =
  "Got a consumer or sports company I should look at? Reply to this email or send it to ryan@backfieldventures.com.";

export const WHY_HANDOFF =
  "You're getting The Handoff because you asked to be on it. I write it once a month.";

function phrasePattern(phrase: string): RegExp {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, "i");
}

export function hasBlockedPhrase(value: string): boolean {
  return BLOCKED.some((phrase) => phrasePattern(phrase).test(value));
}

export function hasGroupVoice(value: string): boolean {
  return GROUP_VOICE.some((phrase) => phrasePattern(phrase).test(value));
}

export function hasLongDash(value: string): boolean {
  return /[\u2013\u2014]/.test(value);
}

export type SendCheck = {
  id: string;
  label: string;
  pass: boolean;
};

export function reviewSend(input: {
  subject: string;
  text: string;
  html: string;
  requireIssue?: boolean;
}): SendCheck[] {
  const blob = `${input.subject}\n${input.text}\n${input.html}`;
  const checks: SendCheck[] = [
    { id: "subject", label: "Subject set", pass: input.subject.trim().length > 0 },
  ];
  if (input.requireIssue !== false) {
    checks.push({ id: "issue", label: "Issue number set", pass: /Issue\s+\d{2}\b/.test(input.subject) });
  }
  checks.push(
    { id: "disclaimer", label: "Disclaimer present", pass: blob.includes(DISCLAIMER) },
    { id: "address", label: "Footer address present", pass: blob.includes(ADDRESS) },
    { id: "unsub", label: "Unsubscribe link present", pass: /https:\/\/backfieldventures\.com\/u\/\S+/.test(blob) },
    { id: "phrases", label: "Clear of blocked phrases", pass: !hasBlockedPhrase(blob) },
    { id: "dashes", label: "No em or en dashes", pass: !hasLongDash(blob) },
    { id: "voice", label: "First person only", pass: !hasGroupVoice(blob) },
  );
  return checks;
}

export function checksPass(checks: SendCheck[]): boolean {
  return checks.every((check) => check.pass);
}
