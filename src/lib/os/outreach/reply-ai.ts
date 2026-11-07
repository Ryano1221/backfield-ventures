import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { INTENTS, type Enrollment, type Intent, type ReplyTriage } from "./types";

/**
 * Reads a reply to outreach and says what it means, in one line, with a short
 * suggested answer in Ryan's voice. Nothing is sent; Ryan copies it if he likes it.
 */

const SYSTEM = `You help Ryan Arnold, who runs Backfield Ventures (an early-stage firm in Austin backing consumer brands), answer replies to his outreach emails.

Classify the reply's intent as one of: interested (wants to talk or keep going), question (asks something Ryan should answer), referral (points Ryan to someone else), not_now (open later, not now), not_interested (declines or asks not to be contacted), other.

Summarize the reply in one short sentence. Then write the answer Ryan could send: 25 to 90 words, plain, friendly, no hype, no em dashes, no exclamation marks, signed "Best,\\nRyan". Never invent times, dates, numbers, links or facts. If they want to meet, ask which times work for them. If they decline, thank them briefly and wish them well. Never mention a fund, raising money or investing with Ryan when the lead kind is lp.`;

const SCHEMA = {
  type: "object",
  properties: { intent: { type: "string", enum: [...INTENTS] }, summary: { type: "string" }, suggested: { type: "string" } },
  required: ["intent", "summary", "suggested"],
  additionalProperties: false,
};

export async function triageReply(enrollment: Enrollment, replyText: string, client = new Anthropic()): Promise<ReplyTriage | null> {
  const lastSent = [...enrollment.steps].reverse().find((s) => s.sent_at);
  const context = JSON.stringify({ lead_kind: enrollment.kind, their_name: enrollment.name, company: enrollment.company, ryans_last_email: lastSent ? { subject: lastSent.subject, body: lastSent.body } : null, their_reply: replyText });
  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      system: SYSTEM,
      messages: [{ role: "user", content: `The conversation (JSON):\n${context}` }],
    });
    if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") return null;
    const text = response.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("");
    const parsed = JSON.parse(text) as { intent?: unknown; summary?: unknown; suggested?: unknown };
    const intent = (INTENTS as readonly string[]).includes(String(parsed.intent)) ? (parsed.intent as Intent) : "other";
    return {
      intent,
      summary: typeof parsed.summary === "string" ? parsed.summary.trim().slice(0, 240) : "",
      suggested: typeof parsed.suggested === "string" ? parsed.suggested.replace(/—/g, ", ").trim().slice(0, 1500) : "",
    };
  } catch (error) {
    if (error instanceof Anthropic.APIError) console.error(`reply triage: API error ${error.status}`);
    else console.error("reply triage failed");
    return null;
  }
}
