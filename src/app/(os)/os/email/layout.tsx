import type { ReactNode } from "react";
import { headers } from "next/headers";
import { EmailShell } from "@/components/email/EmailShell";
import { isOsHost } from "@/lib/os/host";
import "./email.css";

export const dynamic = "force-dynamic";

export default async function EmailLayout({ children }: { children: ReactNode }) {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  return <EmailShell onOs={isOsHost(host)}>{children}</EmailShell>;
}
