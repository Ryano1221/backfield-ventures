import { NextRequest, NextResponse } from "next/server";

const COOKIE = "bfv_fund1_auth";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

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

export const config = {
  matcher: ["/fund1/:path*"],
};
