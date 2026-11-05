import type { Metadata } from "next";
import { headers } from "next/headers";
import { DriveDesk } from "@/components/os/night/DriveDesk";
import { NightFrame } from "@/components/os/night/NightFrame";
import { buildDrive, driveCount } from "@/lib/os/drive";
import { isOsHost } from "@/lib/os/host";
import { osChromeCounts } from "@/lib/os/nav";
import { buildToday } from "@/lib/os/night";
import { loadOsPage } from "@/lib/os/page-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Drive | Backfield OS",
  robots: { index: false, follow: false },
};

export default async function DrivePage() {
  const page = await loadOsPage();
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const model = buildToday(page.snapshot, page.actions);
  const count = driveCount(buildDrive(page.snapshot, page.actions), page.actions);
  return (
    <NightFrame onOs={isOsHost(host)} active="drive" counts={osChromeCounts(page.snapshot, model)} stamp={model.stamp} stale={page.model.stale} initialActions={page.actions} finder={page.finder} driveCount={count}>
      <DriveDesk snapshot={page.snapshot} />
    </NightFrame>
  );
}
