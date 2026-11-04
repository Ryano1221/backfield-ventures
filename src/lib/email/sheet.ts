import type { Env } from "./flags";
import { flagOn, SHEET_FLAG } from "./flags";

export type SheetFields = {
  name: string;
  email: string;
  source: string;
  signupSource: string;
};

export type SheetResult = { skipped: true } | { skipped: false; ok: boolean };

function chicagoReceived(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
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

export async function fileSignupToSheet(fields: SheetFields, env: Env = process.env): Promise<SheetResult> {
  if (!flagOn(env, SHEET_FLAG)) return { skipped: true };

  const url = env.HANDOFF_SHEET_URL?.trim() ?? "";
  const secret = env.HANDOFF_SHEET_SECRET?.trim() ?? "";
  if (!url || !secret) return { skipped: false, ok: false };

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
    if (posted.status !== 302) return { skipped: false, ok: false };
    const location = posted.headers.get("location");
    if (!location) return { skipped: false, ok: false };
    const followed = await fetch(new URL(location, url), { method: "GET", redirect: "follow" });
    const data = (await followed.json()) as { ok?: unknown };
    return { skipped: false, ok: data?.ok === true };
  } catch {
    return { skipped: false, ok: false };
  }
}
