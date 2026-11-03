import { isOsAuthed } from "@/lib/os/current";
import { osJson } from "@/lib/os/response";
import { readSnapshot } from "@/lib/os/store";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isOsAuthed())) return osJson({ error: "Unauthorized" }, 401);
  const snapshot = await readSnapshot();
  return osJson({ snapshot });
}
