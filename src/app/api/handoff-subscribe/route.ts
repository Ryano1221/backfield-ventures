import { NextRequest, NextResponse } from "next/server";
import { createBeehiivSubscription, type BeehiivSubscriptionResult } from "@/lib/beehiiv";
import { addHandoffContact, notifyHandoffSubscribe, sendHandoffNotice } from "@/lib/notify";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SOURCE = "handoff-public";
const TEST_SOURCE = "handoff-TEST";

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

const ATTR_MAX = 200;

function cleanAttr(value: unknown) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, ATTR_MAX);
}

// One trailing sheet value. src wins; the referrer host is only the fallback.
// utm_source, utm_medium, and utm_campaign are appended when the page URL had them.
// utm_term and utm_content stay off the sheet and are only forwarded to beehiiv.
function signupAttrs(body: {
  src?: unknown;
  utm_source?: unknown;
  utm_medium?: unknown;
  utm_campaign?: unknown;
  utm_term?: unknown;
  utm_content?: unknown;
  referrer?: unknown;
}) {
  return {
    src: cleanAttr(body.src),
    utmSource: cleanAttr(body.utm_source),
    utmMedium: cleanAttr(body.utm_medium),
    utmCampaign: cleanAttr(body.utm_campaign),
    utmTerm: cleanAttr(body.utm_term),
    utmContent: cleanAttr(body.utm_content),
    referrer: cleanAttr(body.referrer),
  };
}

function signupSourceFrom(body: {
  src?: unknown;
  utm_source?: unknown;
  utm_medium?: unknown;
  utm_campaign?: unknown;
  referrer?: unknown;
}) {
  const attrs = signupAttrs(body);
  const parts: string[] = [];
  const primary = attrs.src || attrs.referrer;
  if (primary) parts.push(primary);
  if (attrs.utmSource) parts.push(`utm_source=${attrs.utmSource}`);
  if (attrs.utmMedium) parts.push(`utm_medium=${attrs.utmMedium}`);
  if (attrs.utmCampaign) parts.push(`utm_campaign=${attrs.utmCampaign}`);
  return parts.join(" ");
}

// Apps Script answers the POST with a 302. Follow that once as a GET.
// signupSource is a new trailing field. received, name, email, and source stay
// in that order so the existing sheet columns are unchanged.
async function fileHandoffSubscriber(fields: {
  name: string;
  email: string;
  source: string;
  signupSource: string;
}) {
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
        signupSource: fields.signupSource,
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
// Record the signup first. The sheet write, the optional beehiiv subscription,
// and the optional Resend contact run together. Mail goes out only after one
// of those paths records the person. A failed email does not lose the signup.
// The visitor sees success when any enabled path succeeds.
// HANDOFF_BEEHIIV_ENABLED must be exactly "true" or beehiiv is not called.
// HANDOFF_RESEND_ENABLED stays on unless it is exactly "false". "false" skips
// the Resend contact and the subscriber confirmation. The internal notice
// still sends.
// Test mode: send header x-handoff-test equal to HANDOFF_TEST_TOKEN. The row is
// written with source "handoff-TEST", the contact goes to HANDOFF_TEST_SEGMENT_ID,
// beehiiv is skipped, and no email is sent.

function resendContactsEnabled() {
  return process.env.HANDOFF_RESEND_ENABLED !== "false";
}

function logBeehiiv(result: BeehiivSubscriptionResult | null) {
  if (!result || result.ok) return;
  if (result.error === "missing_config") {
    console.error("[handoff-subscribe] beehiiv skipped", "missing_config");
    return;
  }
  console.error("[handoff-subscribe] beehiiv failed", result.status, result.error ?? "error");
}

export async function POST(req: NextRequest) {
  let body: {
    type?: unknown;
    name?: unknown;
    email?: unknown;
    src?: unknown;
    utm_source?: unknown;
    utm_medium?: unknown;
    utm_campaign?: unknown;
    utm_term?: unknown;
    utm_content?: unknown;
    referrer?: unknown;
  };
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

  const testToken = process.env.HANDOFF_TEST_TOKEN?.trim() ?? "";
  const isTest = !!testToken && req.headers.get("x-handoff-test") === testToken;
  const source = isTest ? TEST_SOURCE : SOURCE;
  const segmentId =
    (isTest ? process.env.HANDOFF_TEST_SEGMENT_ID : process.env.HANDOFF_SEGMENT_ID)?.trim() ?? "";

  const signupSource = signupSourceFrom(body);
  const attrs = signupAttrs(body);
  const payload = { type: "subscribe" as const, name, email, source };
  const resendOn = resendContactsEnabled();
  const beehiivOn = process.env.HANDOFF_BEEHIIV_ENABLED === "true" && !isTest;

  const [filed, beehiiv, contact] = await Promise.all([
    fileHandoffSubscriber({ name, email, source, signupSource }),
    beehiivOn
      ? createBeehiivSubscription({
          email,
          name,
          utmSource: attrs.src || SOURCE,
          utmMedium: attrs.utmMedium,
          utmCampaign: attrs.utmCampaign,
          utmTerm: attrs.utmTerm,
          utmContent: attrs.utmContent,
          referringSite: attrs.referrer,
        }).catch(() => {
          const failed: BeehiivSubscriptionResult = { ok: false, status: 0, error: "unexpected" };
          return failed;
        })
      : Promise.resolve(null),
    resendOn ? addHandoffContact({ name, email, segmentId, signupSource }) : Promise.resolve(false),
  ]);
  if (!filed) console.error("handoff sheet write failed", { source });
  logBeehiiv(beehiiv);
  if (resendOn && !contact) console.error("handoff resend contact failed", { source, segment: !!segmentId });

  const recorded = filed || beehiiv?.ok === true || (resendOn && contact);
  if (!recorded) {
    console.log("handoff-subscribe unrecorded", { source });
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  if (isTest) {
    return NextResponse.json({
      ok: true,
      test: true,
      sheet: filed,
      resend: contact,
      beehiiv: "skipped",
    });
  }

  if (resendOn) {
    const sent = await notifyHandoffSubscribe({ name, email, source }).catch(() => {
      console.error("handoff email error");
      return false;
    });
    if (!sent) console.error("handoff confirmation or notice failed", { source });
  } else {
    const noticed = await sendHandoffNotice({ name, email, source }).catch(() => {
      console.error("handoff notice error");
      return false;
    });
    if (!noticed) console.error("handoff notice failed", { source });
  }

  const webhook = process.env.HANDOFF_WEBHOOK_URL;
  if (webhook) {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch((error) => console.error("handoff webhook error", error));
  }

  return NextResponse.json({ ok: true });
}
