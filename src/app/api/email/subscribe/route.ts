import { NextResponse } from "next/server";
import { parseSubscribe, subscribe } from "@/lib/email/subscribe";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const parsed = parseSubscribe(body);
  if (!parsed.ok) return NextResponse.json({ ok: false }, { status: 400, headers: { "Cache-Control": "no-store" } });
  const result = await subscribe(parsed.value);
  return NextResponse.json(
    {
      ok: true,
      dryRun: result.dryRun,
      joined: result.joined,
      status: result.status,
      sheet: result.sheet,
      confirmationSent: result.confirmationSent,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
