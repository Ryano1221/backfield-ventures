import { NextRequest, NextResponse } from "next/server";
import { decideOs, isOsHost, normalizePath } from "./lib/os/host";
import { OS_COOKIE, sessionSecret, verifySessionToken } from "./lib/os/session";
import { PRIVATE_HEADERS } from "./lib/os/types";

const FUND_COOKIE = "bfv_fund1_auth";

function applyPrivate(res: NextResponse) {
  for (const [key, value] of Object.entries(PRIVATE_HEADERS)) res.headers.set(key, value);
  return res;
}

export function proxy(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const { pathname } = req.nextUrl;
  const path = normalizePath(pathname);
  const touchesOs =
    isOsHost(host) ||
    path === "/os" ||
    path.startsWith("/os/") ||
    path === "/api/os" ||
    path.startsWith("/api/os/") ||
    path === "/api/ingest";
  const authed = touchesOs && verifySessionToken(req.cookies.get(OS_COOKIE)?.value, sessionSecret());
  const decision = decideOs({
    host,
    pathname,
    authed,
    vercelEnv: process.env.VERCEL_ENV,
  });

  if (decision.kind === "not-found") {
    return applyPrivate(new NextResponse("Not found", { status: 404 }));
  }
  if (decision.kind === "unauthorized") {
    return applyPrivate(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }
  if (decision.kind === "robots") {
    return applyPrivate(
      new NextResponse("User-agent: *\nDisallow: /\n", {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      }),
    );
  }
  if (decision.kind === "redirect") {
    const url = req.nextUrl.clone();
    url.pathname = decision.pathname;
    url.search = "";
    return applyPrivate(NextResponse.redirect(url, 303));
  }
  if (decision.kind === "rewrite") {
    const url = req.nextUrl.clone();
    url.pathname = decision.pathname;
    return applyPrivate(NextResponse.rewrite(url));
  }
  if (decision.kind === "os-next") return applyPrivate(NextResponse.next());

  // Send /deck through the existing /fund1 gate. Unauthenticated visitors
  // then land on /fund1/login; authenticated visitors get /fund1.
  // This is a redirect only, so /deck never returns deck HTML or JS.
  if (pathname === "/deck" || pathname.startsWith("/deck/")) {
    const fundUrl = req.nextUrl.clone();
    fundUrl.pathname = "/fund1";
    return NextResponse.redirect(fundUrl);
  }

  // Only protect /fund1 (but not /fund1/login or the auth API)
  if (pathname.startsWith("/fund1") && !pathname.startsWith("/fund1/login")) {
    const auth = req.cookies.get(FUND_COOKIE)?.value;
    if (auth !== "1") {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/fund1/login";
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

// Public pages, including /lists, pass through. Dashboard paths are gated above.
export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?|webmanifest)$).*)"],
};
