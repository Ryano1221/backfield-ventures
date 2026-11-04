import type { Metadata } from "next";
import { headers } from "next/headers";
import { NightFrame } from "@/components/os/night/NightFrame";
import { PeopleDesk } from "@/components/os/night/PeopleDesk";
import { isOsHost } from "@/lib/os/host";
import { osChromeCounts } from "@/lib/os/nav";
import { buildPeople, buildToday } from "@/lib/os/night";
import { loadOsPage } from "@/lib/os/page-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "People | Backfield OS",
  robots: { index: false, follow: false },
};

export default async function CrmPage() {
  const page = await loadOsPage();
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const model = buildToday(page.snapshot, page.actions);
  const people = buildPeople(page.snapshot);
  return (
    <NightFrame onOs={isOsHost(host)} active="people" counts={osChromeCounts(page.snapshot, model)} stamp={model.stamp} stale={page.model.stale} initialActions={page.actions} finder={page.finder}>
      <PeopleDesk rows={people.rows} counts={people.counts} tracks={people.tracks} total={people.total} warm={people.warm} counted={people.counted} onOs={isOsHost(host)} />
    </NightFrame>
  );
}
