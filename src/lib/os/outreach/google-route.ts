import "server-only";
import { isOsHost } from "../host";
import { osHrefs } from "../nav";

export const STATE_COOKIE = "bfv_gmail_state";

/** Where Google sends Ryan back. Must match a redirect URI on the Google OAuth client exactly. */
export function redirectUri(req: Request, env: Record<string, string | undefined> = process.env): string {
  const fixed = env.GOOGLE_REDIRECT_URI?.trim();
  if (fixed) return fixed;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host;
  const proto = req.headers.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
  return `${proto}://${host}/api/os/gmail/callback`;
}

/** The Leads page on whichever host Ryan is using. */
export function leadsPage(req: Request, query: string): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host;
  const proto = req.headers.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
  return `${proto}://${host}${osHrefs(isOsHost(host)).leads}?${query}`;
}

export function cookieValue(req: Request, name: string): string | null {
  for (const part of (req.headers.get("cookie") ?? "").split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}
