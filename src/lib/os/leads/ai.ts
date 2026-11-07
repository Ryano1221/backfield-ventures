import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Lead, LeadDraft } from "./types";

/**
 * Claude writes the first email from the lead's public facts and gives its own
 * fit read. Runs only when ANTHROPIC_API_KEY is set; otherwise the template
 * draft is used. Nothing is sent.
 */

export type AiRead = { draft: LeadDraft; fit: number; why: string[] };

const SYSTEM = `You write first-touch emails for Ryan Arnold, who runs Backfield Ventures, an early-stage fund in Austin, Texas that backs consumer brands.

Ryan's style: short, plain, friendly, no hype. 60 to 110 words. No buzzwords, no flattery, no em dashes, no exclamation marks. Sign off "Best,\\nRyan".

Use only the facts given. Name one specific fact that made the lead stand out. Never invent numbers, customers, mutual contacts or past conversations.

By lead kind:
- founder: Ryan may want to invest. Ask for a short call to learn more.
- partner: another investor running a fund or angel syndicate. Offer to swap deals and mention Ryan's monthly note with three companies he likes.
- lp: a possible backer of the fund. A relationship note only: no fund terms, no returns, no ask to invest.

Also rate fit from 0 to 100 for an early consumer-brand fund in Austin, with up to three short reasons.`;

const SCHEMA = {
  type: "object",
  properties: {
    subject: { type: "string" },
    body: { type: "string" },
    fit: { type: "integer" },
    why: { type: "array", items: { type: "string" } },
  },
  required: ["subject", "body", "fit", "why"],
  additionalProperties: false,
};

export function aiReady(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.ANTHROPIC_API_KEY?.trim());
}

function facts(lead: Lead): string {
  const to = lead.contacts.find((c) => c.email === lead.to) ?? lead.contacts[0];
  return JSON.stringify({
    kind: lead.kind,
    company_or_fund: lead.company,
    location: lead.location,
    website: lead.website,
    writing_to: to?.name ?? lead.people[0]?.name ?? null,
    people: lead.people,
    facts: lead.signals.map((s) => `${s.label}: ${s.value}`),
    ryans_note: lead.note || null,
    source: lead.source,
  });
}

export async function aiRead(lead: Lead, client = new Anthropic()): Promise<AiRead | null> {
  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      system: SYSTEM,
      messages: [{ role: "user", content: `Lead facts (JSON):\n${facts(lead)}\n\nWrite the email and rate the fit.` }],
    });
    if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") return null;
    const text = response.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("");
    const parsed = JSON.parse(text) as { subject?: unknown; body?: unknown; fit?: unknown; why?: unknown };
    if (typeof parsed.subject !== "string" || typeof parsed.body !== "string" || typeof parsed.fit !== "number") return null;
    const body = parsed.body.replace(/—/g, ", ").trim();
    return {
      draft: { subject: parsed.subject.trim().slice(0, 140), body: body.slice(0, 2000), by: "ai" },
      fit: Math.max(0, Math.min(100, Math.round(parsed.fit))),
      why: Array.isArray(parsed.why) ? parsed.why.filter((w): w is string => typeof w === "string").slice(0, 3) : [],
    };
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) console.error("leads ai: rate limited");
    else if (error instanceof Anthropic.APIError) console.error(`leads ai: API error ${error.status}`);
    else console.error("leads ai: could not read the draft");
    return null;
  }
}
