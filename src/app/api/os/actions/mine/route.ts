import { readActions } from "@/lib/os/actions";
import { isOsAuthed } from "@/lib/os/current";
import { osJson } from "@/lib/os/response";

export const dynamic = "force-dynamic";

/** Ryan's own action rows. The bearer pending route stays for the office box. */
export async function GET() {
  if (!(await isOsAuthed())) return osJson({ error: "Unauthorized" }, 401);
  return osJson({ actions: await readActions() });
}
