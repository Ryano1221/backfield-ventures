import { isOsAuthed } from "@/lib/os/current";
import { normalizeDomain, normalizeLogoUrl } from "@/lib/os/present";
import { PRIVATE_HEADERS } from "@/lib/os/types";

export const dynamic = "force-dynamic";

const cache = new Map<string, { body: Uint8Array; type: string; exp: number }>();

export async function GET(req: Request) {
  if (!(await isOsAuthed())) return new Response(null, { status: 401, headers: PRIVATE_HEADERS });
  const url = new URL(req.url);
  const logo = normalizeLogoUrl(url.searchParams.get("url"));
  const domain = normalizeDomain(url.searchParams.get("domain"));
  const target = logo || (domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128` : "");
  if (!target) return miss();
  const hit = cache.get(target);
  if (hit && hit.exp > Date.now()) return image(hit.body, hit.type);
  const fetched = await fetchImage(target);
  if (!fetched) return miss();
  if (!logo && fetched.body.byteLength < 800) return miss();
  cache.set(target, { body: fetched.body, type: fetched.type, exp: Date.now() + 86_400_000 });
  return image(fetched.body, fetched.type);
}

const MISS_GIF = Uint8Array.from([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b,
]);

function miss(): Response {
  return new Response(Buffer.from(MISS_GIF), {
    headers: { ...PRIVATE_HEADERS, "Content-Type": "image/gif", "X-Logo-Miss": "1", "Cache-Control": "private, max-age=3600" },
  });
}

function image(body: Uint8Array, type: string): Response {
  return new Response(Buffer.from(body), {
    headers: {
      ...PRIVATE_HEADERS,
      "Content-Type": type,
      "Cache-Control": "private, max-age=86400",
    },
  });
}

async function fetchImage(target: string): Promise<{ body: Uint8Array; type: string } | null> {
  let current = target;
  for (let hop = 0; hop < 3; hop += 1) {
    if (!allowed(current)) return null;
    const response = await fetch(current, { redirect: "manual", signal: AbortSignal.timeout(4000) }).catch(() => null);
    if (!response) return null;
    if (response.status >= 300 && response.status < 400) {
      const next = response.headers.get("location");
      if (!next) return null;
      current = new URL(next, current).toString();
      continue;
    }
    if (!response.ok) return null;
    const type = (response.headers.get("content-type") || "").split(";")[0]?.trim().toLowerCase() || "";
    if (!type.startsWith("image/")) return null;
    const body = new Uint8Array(await response.arrayBuffer());
    if (body.byteLength < 32 || body.byteLength > 200_000) return null;
    return { body, type };
  }
  return null;
}

function allowed(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const host = url.hostname.toLowerCase();
    if (!normalizeDomain(host)) return false;
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      const [a, b] = host.split(".").map(Number);
      if (a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}
