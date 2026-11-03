import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isOsAuthed } from "@/lib/os/current";
import { isOsHost } from "@/lib/os/host";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in | Backfield OS",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const onOs = isOsHost(host);
  if (await isOsAuthed()) redirect(onOs ? "/" : "/os");
  return (
    <main className="os-login">
      <img src="/brand/backfield-ventures-logo-black.png" alt="Backfield Ventures" className="os-wordmark" />
      <h1>Operating system</h1>
      <p className="os-lede">Private dashboard for Ryan.</p>
      <LoginForm destination={onOs ? "/" : "/os"} />
      <p className="os-fine">Austin, TX</p>
    </main>
  );
}
