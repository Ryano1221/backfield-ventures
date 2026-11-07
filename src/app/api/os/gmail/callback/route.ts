import { NextResponse } from "next/server";
import { isOsAuthed } from "@/lib/os/current";
import { osJson } from "@/lib/os/response";
import { exchangeCode, googleApp } from "@/lib/os/outreach/gmail";
import { cookieValue, leadsPage, redirectUri, STATE_COOKIE } from "@/lib/os/outreach/google-route";
import { saveGmail } from "@/lib/os/outreach/server";
import { tokenMatches } from "@/lib/os/session";

export const dynamic = "force-dynamic";

/** Google sends Ryan back here with a one-time code; it becomes a stored, encrypted connection. */
export async function GET(req: Request) {
  if (!(await isOsAuthed())) return osJson({ error: "Unauthorized" }, 401);
  const url = new URL(req.url);
  const back = (query: string) => {
    const res = NextResponse.redirect(leadsPage(req, query), 303);
    res.cookies.set({ name: STATE_COOKIE, value: "", path: "/api/os/gmail", maxAge: 0 });
    return res;
  };
  const state = url.searchParams.get("state");
  if (!state || !tokenMatches(state, cookieValue(req, STATE_COOKIE) ?? undefined)) return back("gmail=expired");
  if (url.searchParams.get("error")) return back("gmail=declined");
  const code = url.searchParams.get("code");
  const app = googleApp();
  if (!code || !app) return back("gmail=failed");
  try {
    const { refreshToken, email } = await exchangeCode(fetch, app, code, redirectUri(req));
    await saveGmail(email, refreshToken);
    return back("gmail=connected");
  } catch {
    return back("gmail=failed");
  }
}

export async function POST() {
  if (!(await isOsAuthed())) return osJson({ error: "Unauthorized" }, 401);
  return osJson({ error: "Use GET" }, 405);
}
