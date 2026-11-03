import { readAnswers } from "@/lib/os/answers";
import { osJson } from "@/lib/os/response";
import { bearerToken, tokenMatches } from "@/lib/os/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const gate = ingestAuth(req);
  if (gate) return gate;
  const answers = await readAnswers();
  return osJson({ answers });
}

function ingestAuth(req: Request): Response | null {
  const expected = process.env.OS_INGEST_TOKEN;
  if (!expected) return osJson({ error: "Ingest is not configured" }, 503);
  if (!tokenMatches(bearerToken(req.headers.get("authorization")), expected)) {
    return osJson({ error: "Unauthorized" }, 401);
  }
  return null;
}
