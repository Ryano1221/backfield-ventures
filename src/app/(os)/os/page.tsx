import type { Metadata } from "next";
import { NightFrame } from "@/components/os/night/NightFrame";
import { TodayDesk } from "@/components/os/night/TodayDesk";
import { isOsHost } from "@/lib/os/host";
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
  return (
    <NightFrame onOs={isOsHost(host)} active="today" counts={counts(page.snapshot, model)} stamp={model.stamp} stale={page.model.stale} initialActions={page.actions} finder={page.finder}>
      <TodayDesk model={model} onOs={isOsHost(host)} />
    </NightFrame>
  );
}

function counts(snapshot: { decisions: unknown[] } | null, model: ReturnType<typeof buildToday>) {
  if (!snapshot) return { today: null, deals: null, people: null };
  return {
    today: model.ready.length + model.hold.length + model.open.length,
    deals: model.reviewingCount,
    people: model.peopleCount,
  };
}
