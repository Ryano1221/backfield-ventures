import { emailSessionOk } from "@/lib/email/auth";
import { SAMPLE_UNSUB_URL } from "@/lib/email/copy";
import { sendEmail } from "@/lib/email/send";
import { getDraft } from "@/lib/email/templates";
import { osJson } from "@/lib/os/response";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await emailSessionOk())) return osJson({ error: "Unauthorized" }, 401);
  let draftId = "issue-01";
  try {
    const body = (await req.json()) as { draftId?: unknown };
    if (typeof body.draftId === "string") draftId = body.draftId;
  } catch {
    draftId = "issue-01";
  }
  const draft = getDraft(draftId);
  if (!draft || draft.channel === "gmail") return osJson({ ok: false }, 400);
  const result = sendEmail({
    from: draft.from,
    replyTo: draft.replyTo,
    to: draft.listLabel,
    subject: draft.subject,
    html: draft.html,
    text: draft.text,
    unsubscribeUrl: SAMPLE_UNSUB_URL,
  });
  return osJson({
    ok: true,
    dryRun: result.dryRun,
    blocked: true,
    note: "Sending is off for this preview.",
  });
}
