import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { isOsAuthed } from "@/lib/os/current";
import { osJson } from "@/lib/os/response";
import { consentUrl, googleApp } from "@/lib/os/outreach/gmail";
import { redirectUri, STATE_COOKIE } from "@/lib/os/outreach/google-route";

export const dynamic = "force-dynamic";

/** Sends Ryan to Google to allow sending from (and reading replies in) his Gmail. */
export async function GET(req: Request) {
  if (!(await isOsAuthed())) return osJson({ error: "Unauthorized" }, 401);
  const app = googleApp();
  if (!app) return osJson({ error: "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET first" }, 503);
  const state = randomBytes(24).toString("base64url");
  const res = NextResponse.redirect(consentUrl(app, redirectUri(req), state), 302);
  res.cookies.set({ name: STATE_COOKIE, value: state, httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/os/gmail", maxAge: 600 });
  return res;
}

export async function POST() {
  if (!(await isOsAuthed())) return osJson({ error: "Unauthorized" }, 401);
  return osJson({ error: "Use GET" }, 405);
}
