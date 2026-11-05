import type { Metadata } from "next";
import { NightFrame } from "@/components/os/night/NightFrame";
import { TodayDesk } from "@/components/os/night/TodayDesk";
import { isOsHost } from "@/lib/os/host";
import { osChromeCounts } from "@/lib/os/nav";
import { buildDrive, driveCount } from "@/lib/os/drive";
import { buildToday } from "@/lib/os/night";
import { loadOsPage } from "@/lib/os/page-data";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Today | Backfield OS",
  robots: { index: false, follow: false },
};

export default async function OsPage() {
  const page = await loadOsPage();
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const model = buildToday(page.snapshot, page.actions);
  const drive = driveCount(buildDrive(page.snapshot, page.actions), page.actions);
  return (
    <NightFrame onOs={isOsHost(host)} active="today" counts={osChromeCounts(page.snapshot, model)} stamp={model.stamp} stale={page.model.stale} initialActions={page.actions} finder={page.finder} driveCount={drive}>
      <TodayDesk model={model} onOs={isOsHost(host)} driveCount={drive} />
    </NightFrame>
  );
}
