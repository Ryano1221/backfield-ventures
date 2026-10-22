import { NextRequest, NextResponse } from "next/server";

const COOKIE = "bfv_fund1_auth";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Send /deck through the existing /fund1 gate. Unauthenticated visitors
  // then land on /fund1/login; authenticated visitors get /fund1.
  // This is a redirect only, so /deck never returns deck HTML or JS.
  if (pathname === "/deck" || pathname.startsWith("/deck/")) {
    const fundUrl = req.nextUrl.clone();
    fundUrl.pathname = "/fund1";
    return NextResponse.redirect(fundUrl);
  }

  // Only protect /fund1 (but not /fund1/login or the auth API)
  if (
    pathname.startsWith("/fund1") &&
    !pathname.startsWith("/fund1/login")
  ) {
    const auth = req.cookies.get(COOKIE)?.value;
    if (auth !== "1") {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/fund1/login";
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

// /lists is public. Keep it out of this matcher so this proxy does not gate it.
export const config = {
  matcher: ["/fund1/:path*", "/deck", "/deck/:path*"],
};
