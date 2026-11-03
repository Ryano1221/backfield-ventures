import { cookies } from "next/headers";
import { OS_COOKIE, sessionSecret, verifySessionToken } from "./session";

export async function isOsAuthed(): Promise<boolean> {
  const jar = await cookies();
  return verifySessionToken(jar.get(OS_COOKIE)?.value, sessionSecret());
}
