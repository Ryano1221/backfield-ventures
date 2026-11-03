import { mintSessionToken, passwordsMatch, sessionSecret, SESSION_TTL_SEC } from "@/lib/os/session";
import { osJson, sessionCookie } from "@/lib/os/response";
import { clientIp, LOGIN_FAILURE_DELAY_MS, LoginLimiter, sleep } from "@/lib/os/rate-limit";

export const dynamic = "force-dynamic";

const limiter = new LoginLimiter();

export async function POST(req: Request) {
  const ip = clientIp(req.headers);
  const gate = limiter.check(ip, Date.now());
  if (!gate.allowed) {
    await sleep(LOGIN_FAILURE_DELAY_MS);
    const res = osJson({ ok: false, error: "Too many attempts. Wait and try again." }, 429);
    res.headers.set("Retry-After", String(gate.retryAfterSec));
    return res;
  }

  let body: { password?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    await sleep(LOGIN_FAILURE_DELAY_MS);
    return osJson({ ok: false, error: "Invalid request" }, 400);
  }

  const expected = process.env.OS_DASHBOARD_PASSWORD;
  const secret = sessionSecret();
  const password = typeof body.password === "string" ? body.password : "";
  if (!expected || !secret) {
    await sleep(LOGIN_FAILURE_DELAY_MS);
    return osJson({ ok: false, error: "Sign-in is not configured" }, 503);
  }
  if (!password || !passwordsMatch(password, expected)) {
    limiter.recordFailure(ip, Date.now());
    await sleep(LOGIN_FAILURE_DELAY_MS);
    return osJson({ ok: false, error: "Incorrect password" }, 401);
  }

  limiter.recordSuccess(ip);
  const res = osJson({ ok: true });
  res.cookies.set(sessionCookie(mintSessionToken(secret), SESSION_TTL_SEC));
  return res;
}
