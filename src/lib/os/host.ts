export type OsDecision =
  | { kind: "public" }
  | { kind: "os-next" }
  | { kind: "rewrite"; pathname: string }
  | { kind: "redirect"; pathname: string }
  | { kind: "unauthorized" }
  | { kind: "not-found" }
  | { kind: "robots" };

const OS_HOSTS = new Set(["os.backfieldventures.com", "os.localhost"]);

export function normalizeHost(host: string): string {
  const first = host.split(",")[0]?.trim().toLowerCase() ?? "";
  return first.split(":")[0] ?? "";
}

export function normalizePath(pathname: string): string {
  const bare = pathname.split("?")[0]?.split("#")[0] || "/";
  if (bare.length > 1 && bare.endsWith("/")) return bare.slice(0, -1);
  return bare || "/";
}

export function isOsHost(host: string): boolean {
  return OS_HOSTS.has(normalizeHost(host));
}

export function isProductionMainHost(host: string, vercelEnv: string | undefined): boolean {
  if (vercelEnv !== "production") return false;
  const name = normalizeHost(host);
  return name === "backfieldventures.com" || name === "www.backfieldventures.com";
}

export function decideOs(input: {
  host: string;
  pathname: string;
  authed: boolean;
  vercelEnv?: string;
}): OsDecision {
  const path = normalizePath(input.pathname);
  const onOs = isOsHost(input.host);

  if (isProductionMainHost(input.host, input.vercelEnv) && isDashboardPath(path)) {
    return { kind: "not-found" };
  }

  if (onOs) return decideOsHost(path, input.authed);
  return decideShared(path, input.authed);
}

function decideOsHost(path: string, authed: boolean): OsDecision {
  if (path === "/robots.txt") return { kind: "robots" };
  if (path === "/api/ingest") return { kind: "rewrite", pathname: "/api/os/ingest" };
  if (path === "/os") return { kind: "redirect", pathname: authed ? "/" : "/login" };
  if (path === "/os/login") {
    return authed ? { kind: "redirect", pathname: "/" } : { kind: "os-next" };
  }
  if (path === "/") {
    return authed ? { kind: "rewrite", pathname: "/os" } : { kind: "redirect", pathname: "/login" };
  }
  if (path === "/login") {
    return authed ? { kind: "redirect", pathname: "/" } : { kind: "rewrite", pathname: "/os/login" };
  }
  if (path === "/bots") {
    return authed ? { kind: "rewrite", pathname: "/os/bots" } : { kind: "redirect", pathname: "/login" };
  }
  if (path === "/os/bots") {
    return { kind: "redirect", pathname: authed ? "/bots" : "/login" };
  }
  if (path === "/api/os/login" || path === "/api/os/ingest") return { kind: "os-next" };
  if (path === "/api/os" || path.startsWith("/api/os/")) {
    return authed ? { kind: "os-next" } : { kind: "unauthorized" };
  }
  return { kind: "not-found" };
}

function decideShared(path: string, authed: boolean): OsDecision {
  if (!isDashboardPath(path)) return { kind: "public" };
  if (path === "/api/ingest") return { kind: "not-found" };
  if (path === "/api/os/login" || path === "/api/os/ingest") return { kind: "os-next" };
  if (path.startsWith("/api/")) return authed ? { kind: "os-next" } : { kind: "unauthorized" };
  if (path === "/os/login") {
    return authed ? { kind: "redirect", pathname: "/os" } : { kind: "os-next" };
  }
  if (!authed) return { kind: "redirect", pathname: "/os/login" };
  return { kind: "os-next" };
}

function isDashboardPath(path: string): boolean {
  return (
    path === "/os" ||
    path.startsWith("/os/") ||
    path === "/api/os" ||
    path.startsWith("/api/os/") ||
    path === "/api/ingest"
  );
}
