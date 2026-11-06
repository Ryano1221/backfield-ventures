import type { Metadata } from "next";
import { NightFrame } from "@/components/os/night/NightFrame";
import { TodayDesk } from "@/components/os/night/TodayDesk";
import { isOsHost } from "@/lib/os/host";
import { osChromeCounts } from "@/lib/os/nav";
import { buildToday } from "@/lib/os/night";
import { loadOsPage, loadOutreachWeeks } from "@/lib/os/page-data";
import { buildBotDesk } from "@/lib/os/bot-desk";
import { buildCommand } from "@/lib/os/command";
import { readRaise } from "@/lib/os/raise";
import { headers } from "next/headers";
import { readDoc } from "@/lib/os/doc-store";
import { contentWaiting, parseStudio } from "@/lib/os/studio";
import { parseSpvs, spvsForToday } from "@/lib/os/spv";

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
  const now = readClock();
  const command = buildCommand(page.snapshot, await readRaise(), page.snapshot ? buildBotDesk(page.snapshot, page.actions, now) : null, now);
  const content = contentWaiting(parseStudio(await readDoc("content-studio").catch(() => null)));
  const spvs = spvsForToday(parseSpvs(await readDoc("spvs").catch(() => null)), now);
  return (
    <NightFrame onOs={isOsHost(host)} active="today" counts={osChromeCounts(page.snapshot, model)} stamp={model.stamp} stale={page.model.stale} initialActions={page.actions} finder={page.finder}>
      <TodayDesk model={model} onOs={isOsHost(host)} posts={page.snapshot?.posts ?? []} schedule={page.snapshot?.schedule ?? []} warmups={page.snapshot?.warmups ?? []} briefs={page.snapshot?.briefs ?? []} answered={page.snapshot?.answered_decisions ?? []} command={command} stale={page.model.stale} outreachWeeks={await loadOutreachWeeks(page.snapshot, now)} content={content} spvs={spvs} />
    </NightFrame>
  );
}

function readClock(): number {
  return Date.now();
}
