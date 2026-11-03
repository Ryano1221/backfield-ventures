import { isOsAuthed } from "@/lib/os/current";
import { osJson, sessionCookie } from "@/lib/os/response";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!(await isOsAuthed())) return osJson({ error: "Unauthorized" }, 401);
  const res = osJson({ ok: true });
  res.cookies.set(sessionCookie("", 0));
  return res;
}
