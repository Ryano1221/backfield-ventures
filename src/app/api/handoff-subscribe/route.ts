import { NextRequest, NextResponse } from "next/server";
import { notifyHandoffSubscribe } from "@/lib/notify";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SOURCE = "handoff-public";

// Self-hosted subscribe for The Handoff.
// Notifies via the same Resend helper as pitch, invest, and partner.
// Does not write those lists. Beehiiv is not called.
// If self-hosted mail is not enough later, Beehiiv can be added behind an explicit flag
// when BEEHIIV_API_KEY exists. Do not make Beehiiv the primary path.

export async function POST(req: NextRequest) {
  let body: { type?: unknown; name?: unknown; email?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  if (
    body.type !== "subscribe" ||
    !name ||
    name.length > 200 ||
    email.length > 254 ||
    !EMAIL.test(email)
  ) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const payload = { type: "subscribe" as const, name, email, source: SOURCE };

  const webhook = process.env.HANDOFF_WEBHOOK_URL;
  if (webhook) {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch((error) => console.error("handoff webhook error", error));
  }

  const sent = await notifyHandoffSubscribe({ name, email, source: SOURCE }).catch((error) => {
    console.error("handoff email error", error);
    return false;
  });

  if (!sent) {
    console.log("handoff-subscribe", payload);
  }

  return NextResponse.json({ ok: true });
}
