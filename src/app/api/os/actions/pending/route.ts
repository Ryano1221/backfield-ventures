import { readActions } from "@/lib/os/actions";
import { osJson } from "@/lib/os/response";
import { bearerToken, tokenMatches } from "@/lib/os/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const gate = ingestAuth(req);
  if (gate) return gate;
  const actions = (await readActions()).filter((action) => !action.acked_at);
  return osJson({ actions });
}

function ingestAuth(req: Request): Response | null {
  const expected = process.env.OS_INGEST_TOKEN;
  if (!expected) return osJson({ error: "Ingest is not configured" }, 503);
  if (!tokenMatches(bearerToken(req.headers.get("authorization")), expected)) {
    return osJson({ error: "Unauthorized" }, 401);
  }
  return null;
}
