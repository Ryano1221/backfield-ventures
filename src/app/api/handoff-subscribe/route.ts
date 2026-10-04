import { NextRequest, NextResponse } from "next/server";
import { notifyHandoffSubscribe } from "@/lib/notify";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SOURCE = "handoff-public";

function chicagoReceived(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const hour = pick("hour") === "24" ? "00" : pick("hour");
  return `${pick("year")}-${pick("month")}-${pick("day")} ${hour}:${pick("minute")} CT`;
}

// Apps Script answers the POST with a 302. Follow that once as a GET.
async function fileHandoffSubscriber(fields: { name: string; email: string; source: string }) {
  const url = process.env.HANDOFF_SHEET_URL?.trim() ?? "";
  const secret = process.env.HANDOFF_SHEET_SECRET?.trim() ?? "";
  if (!url || !secret) return false;

  try {
    const posted = await fetch(url, {
      method: "POST",
      redirect: "manual",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret,
        received: chicagoReceived(),
        name: fields.name,
        email: fields.email,
        source: fields.source,
      }),
    });
    if (posted.status !== 302) return false;
    const location = posted.headers.get("location");
    if (!location) return false;
    const followed = await fetch(new URL(location, url), { method: "GET", redirect: "follow" });
    const data = (await followed.json()) as { ok?: unknown };
    return data?.ok === true;
  } catch {
    return false;
  }
}

// Self-hosted subscribe for The Handoff.
// Sends the locked confirmation to the address on the form, then the internal notice.
// Success requires Resend to accept both, then the sheet row to be accepted.
// Beehiiv is not called.

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

  const sent = await notifyHandoffSubscribe({ name, email, source: SOURCE }).catch((error) => {
    console.error("handoff email error", error);
    return false;
  });

  if (!sent) {
    console.log("handoff-subscribe", payload);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const webhook = process.env.HANDOFF_WEBHOOK_URL;
  if (webhook) {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch((error) => console.error("handoff webhook error", error));
  }

  const filed = await fileHandoffSubscriber({ name, email, source: SOURCE });
  if (!filed) {
    console.error("handoff sheet write failed");
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
