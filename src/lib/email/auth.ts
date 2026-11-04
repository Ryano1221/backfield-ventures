import { cookies } from "next/headers";
import { OS_COOKIE, sessionSecret, verifySessionToken } from "@/lib/os/session";

export async function emailSessionOk(): Promise<boolean> {
  const jar = await cookies();
  return verifySessionToken(jar.get(OS_COOKIE)?.value, sessionSecret());
}
