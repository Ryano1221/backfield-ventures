import { NextRequest, NextResponse } from "next/server";
import { persistUnsubscribe } from "@/lib/email/store";
import { unsubscribeByToken } from "@/lib/email/unsubscribe";

export const dynamic = "force-dynamic";

async function tokenFrom(req: NextRequest): Promise<string> {
  const fromQuery = req.nextUrl.searchParams.get("token")?.trim() ?? "";
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return fromQuery;
  try {
    const body = (await req.json()) as { token?: unknown };
    if (typeof body.token === "string" && body.token.trim()) return body.token.trim();
  } catch {
    return fromQuery;
  }
  return fromQuery;
}

export async function POST(req: NextRequest) {
  const token = await tokenFrom(req);
  if (!token) return NextResponse.json({ ok: false }, { status: 400, headers: { "Cache-Control": "no-store" } });
  const result = unsubscribeByToken(token);
  if (result.ok && !result.dryRun) await persistUnsubscribe(token);
  const status = result.ok ? 200 : result.reason === "used" ? 409 : 404;
  return NextResponse.json(
    { ok: result.ok, dryRun: result.dryRun, reason: result.ok ? undefined : result.reason },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
