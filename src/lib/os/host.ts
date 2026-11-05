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
  const page = OS_PAGE_REWRITES[path];
  if (page) return authed ? { kind: "rewrite", pathname: page } : { kind: "redirect", pathname: "/login" };
  const nested = nestedOsPage(path);
  if (nested) return authed ? { kind: "rewrite", pathname: nested } : { kind: "redirect", pathname: "/login" };
  if (path.startsWith("/os/") && (OS_INTERNAL_PAGES.has(path) || nestedOsPage(path.slice(3)))) {
    const external = path.slice(3);
    return { kind: "redirect", pathname: authed ? external : "/login" };
  }
  if (isTokenRoute(path)) return { kind: "os-next" };
  if (path === "/api/os" || path.startsWith("/api/os/")) {
    return authed ? { kind: "os-next" } : { kind: "unauthorized" };
  }
  return { kind: "not-found" };
}

function decideShared(path: string, authed: boolean): OsDecision {
  if (!isDashboardPath(path)) return { kind: "public" };
  if (path === "/api/ingest") return { kind: "not-found" };
  if (isTokenRoute(path)) return { kind: "os-next" };
  if (path.startsWith("/api/")) return authed ? { kind: "os-next" } : { kind: "unauthorized" };
  if (path === "/os/login") {
    return authed ? { kind: "redirect", pathname: "/os" } : { kind: "os-next" };
  }
  if (!authed) return { kind: "redirect", pathname: "/os/login" };
  return { kind: "os-next" };
}

const OS_PAGE_REWRITES: Record<string, string> = {
  "/bots": "/os/bots",
  "/crm": "/os/crm",
  "/deals": "/os/deals",
  "/pipeline": "/os/pipeline",
  "/activity": "/os/activity",
  "/email": "/os/email",
  "/waiting": "/os/waiting",
  "/raise": "/os/raise",
};

const NESTED_PREFIXES = ["/d/", "/crm/", "/deals/", "/email/"] as const;

function nestedOsPage(path: string): string | null {
  for (const prefix of NESTED_PREFIXES) {
    if (path.startsWith(prefix) && path.length > prefix.length) return `/os${path}`;
  }
  return null;
}

const OS_INTERNAL_PAGES = new Set(Object.values(OS_PAGE_REWRITES));

function isTokenRoute(path: string): boolean {
  return (
    path === "/api/os/login" ||
    path === "/api/os/ingest" ||
    path === "/api/os/decisions/answered" ||
    path === "/api/os/decisions/ack" ||
    path === "/api/os/actions/pending" ||
    path === "/api/os/actions/ack"
  );
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
