import type { Env } from "./flags";
import { flagOn, SEND_FLAG } from "./flags";

export type OutboundMessage = {
  from: string;
  replyTo: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  headers: Record<string, string>;
};

export type SendInput = {
  from: string;
  replyTo: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  unsubscribeUrl: string;
};

export type MailTransport = {
  deliver(message: OutboundMessage): Promise<{ id: string }>;
};

export function buildMessage(input: SendInput): OutboundMessage {
  return {
    from: input.from,
    replyTo: input.replyTo,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    headers: {
      "List-Unsubscribe": `<${input.unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}

// Builds the message and stops. No network client is imported.
// TODO: after an explicit yes, deliver the message with a MailTransport.
export function sendEmail(input: SendInput, env: Env = process.env): { dryRun: true; message: OutboundMessage } {
  const message = buildMessage(input);
  if (!flagOn(env, SEND_FLAG)) return { dryRun: true, message };
  return { dryRun: true, message };
}
