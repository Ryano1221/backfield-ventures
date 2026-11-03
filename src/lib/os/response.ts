import { NextResponse } from "next/server";
import { OS_COOKIE } from "./session";
import { PRIVATE_HEADERS } from "./types";

export function osJson(body: unknown, status = 200): NextResponse {
  const res = NextResponse.json(body, { status });
  for (const [key, value] of Object.entries(PRIVATE_HEADERS)) res.headers.set(key, value);
  return res;
}

export function sessionCookie(value: string, maxAge: number) {
  return {
    name: OS_COOKIE,
    value,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
