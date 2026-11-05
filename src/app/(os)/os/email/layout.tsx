import type { ReactNode } from "react";
import { headers } from "next/headers";
import { EmailShell } from "@/components/email/EmailShell";
import { NightFrame } from "@/components/os/night/NightFrame";
import { isOsHost } from "@/lib/os/host";
import { osChromeCounts } from "@/lib/os/nav";
import { buildToday } from "@/lib/os/night";
import { loadOsPage } from "@/lib/os/page-data";
import "./email.css";

export const dynamic = "force-dynamic";

export default async function EmailLayout({ children }: { children: ReactNode }) {
  const page = await loadOsPage();
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const onOs = isOsHost(host);
  const model = buildToday(page.snapshot, page.actions);
  return (
    <NightFrame active="email" onOs={onOs} counts={osChromeCounts(page.snapshot, model)} stamp={model.stamp} stale={page.model.stale} initialActions={page.actions} finder={page.finder}>
      <EmailShell onOs={onOs}>{children}</EmailShell>
    </NightFrame>
  );
}
