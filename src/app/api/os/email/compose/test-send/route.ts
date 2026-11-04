import { emailSessionOk } from "@/lib/email/auth";
import { SAMPLE_UNSUB_URL, reviewSend } from "@/lib/email/copy";
import { textToHtml } from "@/lib/email/format";
import { sendEmail } from "@/lib/email/send";
import { getDraft } from "@/lib/email/templates";
import { osJson } from "@/lib/os/response";

export const dynamic = "force-dynamic";

const TEXT_LIMIT = 100_000;

export async function POST(req: Request) {
  if (!(await emailSessionOk())) return osJson({ error: "Unauthorized" }, 401);
  let draftId = "issue-01";
  let text = "";
  try {
    const body = (await req.json()) as { draftId?: unknown; text?: unknown };
    if (typeof body.draftId === "string") draftId = body.draftId;
    if (typeof body.text === "string") text = body.text;
  } catch {
    draftId = "issue-01";
  }
  const draft = getDraft(draftId);
  if (!draft || draft.channel === "gmail") return osJson({ ok: false }, 400);
  const bodyText = text && text.length <= TEXT_LIMIT ? text : draft.text;
  const html = textToHtml(bodyText);
  const result = sendEmail({
    from: draft.from,
    replyTo: draft.replyTo,
    to: "ryan@backfieldventures.com",
    subject: draft.subject,
    html,
    text: bodyText,
    unsubscribeUrl: SAMPLE_UNSUB_URL,
  });
  const checks = reviewSend({
    subject: draft.subject,
    text: bodyText,
    html,
    requireIssue: draft.requireIssue,
  });
  return osJson({
    ok: true,
    dryRun: result.dryRun,
    checks,
    from: result.message.from,
    to: result.message.to,
    subject: result.message.subject,
  });
}
