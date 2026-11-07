import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Lead } from "../leads/types";

/**
 * Claude writes the four follow-ups (and the first email when the lead has no
 * draft) from the lead's facts, following Apollo's playbook. The caller falls
 * back to templates on any failure, and LP emails that mention the fund are thrown out.
 */

const SYSTEM = `You write a 5-email cold outreach sequence for Ryan Arnold, who runs Backfield Ventures, an early-stage firm in Austin, Texas that backs consumer brands. Ryan writes The Handoff, a monthly note on consumer brands he likes (backfieldventures.com/handoff).

The five emails, sent in one thread except the last:
1. first: open with one specific fact about them, say who Ryan is in one sentence, end with a question.
2. value (3 days later): share something useful, such as The Handoff link or a short insight, and ask a light question.
3. angle (a week later): try a different reason to talk than email 1.
4. breakup (a week later): short, gracious, give them an easy out and leave the door open.
5. nurture (3 months later, new thread with its own subject): a warm check-in.

Rules from the playbook: plain text, 40 to 110 words each, 1 to 3 sentences per paragraph, start with "Hi {first name},", sign off "Best,\\nRyan". Emails 1 to 3 end with a question. No buzzwords, flattery, exclamation marks or em dashes. Never invent numbers, peer companies, results, mutual contacts or past conversations; use only the facts given. Subjects for emails 1 and 5 are under 8 words; emails 2 to 4 keep the thread subject (leave their subject empty).

By lead kind:
- founder: Ryan might invest. Ask for a short call.
- partner: another investor running a fund or syndicate. Offer to swap deals and The Handoff.
- lp: someone curious about startups. Talk only about The Handoff and learning about early-stage startups. Never mention a fund, raising, investing with Ryan, commitments, returns, or LPs.

Do not add an unsubscribe line; one is added after.`;

const SCHEMA = {
  type: "object",
  properties: {
    emails: {
      type: "array",
      items: { type: "object", properties: { subject: { type: "string" }, body: { type: "string" } }, required: ["subject", "body"], additionalProperties: false },
    },
  },
  required: ["emails"],
  additionalProperties: false,
};

export async function aiSteps(lead: Lead, client = new Anthropic()): Promise<{ subject: string; body: string }[] | null> {
  const facts = JSON.stringify({
    kind: lead.kind,
    company_or_fund: lead.company,
    writing_to: lead.contacts.find((c) => c.email === lead.to)?.name ?? lead.people[0]?.name ?? null,
    location: lead.location,
    website: lead.website,
    facts: lead.signals.map((s) => `${s.label}: ${s.value}`),
    first_email_already_written: lead.draft ? { subject: lead.draft.subject, body: lead.draft.body } : null,
  });
  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      system: SYSTEM,
      messages: [{ role: "user", content: `Lead (JSON):\n${facts}\n\nWrite all five emails. If a first email is already written, return it unchanged as email 1.` }],
    });
    if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") return null;
    const text = response.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("");
    const parsed = JSON.parse(text) as { emails?: { subject?: unknown; body?: unknown }[] };
    const emails = (parsed.emails ?? []).map((e) => ({ subject: typeof e.subject === "string" ? e.subject.trim() : "", body: typeof e.body === "string" ? e.body.replace(/—/g, ", ").trim() : "" }));
    return emails.length >= 5 && emails.every((e) => e.body) ? emails.slice(0, 5) : null;
  } catch (error) {
    if (error instanceof Anthropic.APIError) console.error(`outreach ai: API error ${error.status}`);
    else console.error("outreach ai: could not read the sequence");
    return null;
  }
}
