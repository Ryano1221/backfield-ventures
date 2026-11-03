import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const OS_COOKIE = "bfv_os_session";
export const SESSION_TTL_SEC = 60 * 60 * 24 * 30;
const SESSION_CONTEXT = "bfv-os-session-v1";

export function sessionSecret(env: Record<string, string | undefined> = process.env): string | null {
  const dedicated = env.OS_SESSION_SECRET?.trim();
  if (dedicated) return dedicated;
  const password = env.OS_DASHBOARD_PASSWORD;
  if (!password) return null;
  return createHmac("sha256", password).update(SESSION_CONTEXT).digest("base64url");
}

export function passwordsMatch(input: string, expected: string | undefined): boolean {
  if (!expected) return false;
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export function bearerToken(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header);
  return match ? match[1] : null;
}

export function tokenMatches(input: string | null, expected: string | undefined): boolean {
  if (!input || !expected) return false;
  return passwordsMatch(input, expected);
}

export function mintSessionToken(secret: string, nowSec = Math.floor(Date.now() / 1000)): string {
  const body = Buffer.from(
    JSON.stringify({ exp: nowSec + SESSION_TTL_SEC, n: randomBytes(16).toString("base64url") }),
  ).toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

export function verifySessionToken(
  value: string | undefined,
  secret: string | null,
  nowSec = Math.floor(Date.now() / 1000),
): boolean {
  if (!value || !secret) return false;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return false;
  const body = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = sign(body, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    timingSafeEqual(b, b);
    return false;
  }
  if (!timingSafeEqual(a, b)) return false;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { exp?: unknown };
    if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) return false;
    if (payload.exp <= nowSec) return false;
    if (payload.exp > nowSec + SESSION_TTL_SEC + 120) return false;
    return true;
  } catch {
    return false;
  }
}

function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}
