import { sameOriginRequest } from "@/lib/os/answers";
import { isOsAuthed } from "@/lib/os/current";
import { osJson } from "@/lib/os/response";
import { forgetGmail } from "@/lib/os/outreach/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isOsAuthed())) return osJson({ error: "Unauthorized" }, 401);
  return osJson({ error: "Use POST" }, 405);
}

/** Forgets the stored Gmail connection. Autopilot stops sending until it is connected again. */
export async function POST(req: Request) {
  if (!(await isOsAuthed())) return osJson({ error: "Unauthorized" }, 401);
  if (!sameOriginRequest(req)) return osJson({ error: "Forbidden" }, 403);
  await forgetGmail();
  return osJson({ ok: true });
}
