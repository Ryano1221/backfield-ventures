import type { Metadata } from "next";
import { headers } from "next/headers";
import { NightFrame } from "@/components/os/night/NightFrame";
import { ReviewDesk } from "@/components/os/night/ReviewDesk";
import { buildCommand } from "@/lib/os/command";
import { readDoc } from "@/lib/os/doc-store";
import { parseHoldings } from "@/lib/os/holdings";
import { isOsHost } from "@/lib/os/host";
import { osChromeCounts, osHrefs } from "@/lib/os/nav";
import { buildPeople, buildToday } from "@/lib/os/night";
import { loadOsPage } from "@/lib/os/page-data";
import { readRaise } from "@/lib/os/raise";
import { weeklyReview } from "@/lib/os/review";
import { parseSpvs } from "@/lib/os/spv";
import { contentWaiting, parseStudio } from "@/lib/os/studio";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Weekly review | Backfield OS",
  robots: { index: false, follow: false },
};

export default async function ReviewPage() {
  const page = await loadOsPage();
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const onOs = isOsHost(host);
  const hrefs = osHrefs(onOs);
  const model = buildToday(page.snapshot, page.actions);
  const now = readClock();
  const [spvs, holdings, studio, ledger] = await Promise.all([
    readDoc("spvs").catch(() => null).then(parseSpvs),
    readDoc("holdings").catch(() => null).then(parseHoldings),
    readDoc("content-studio").catch(() => null).then(parseStudio),
    readRaise(),
  ]);
  const command = buildCommand(page.snapshot, ledger, null, now);
  const people = buildPeople(page.snapshot).rows;
  const items = weeklyReview({
    spvs,
    holdings,
    fund: { target: command.raise.target, hard: command.raise.hard, daysLeft: command.raise.daysLeft },
    goingCold: people.filter((row) => row.goingCold).map((row) => ({ name: row.name, days: row.daysQuiet })),
    overdue: command.due.filter((row) => row.overdue).map((row) => ({ name: row.name, what: row.what })),
    unratedPitches: command.deals.unrated,
    decisionsWaiting: model.ready.length + model.open.length,
    contentWaiting: contentWaiting(studio).length,
    now,
  });
  const monday = new Date(now - ((new Date(now).getUTCDay() + 6) % 7) * 86_400_000);
  const weekOf = monday.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Chicago" });
  return (
    <NightFrame onOs={onOs} active="review" counts={osChromeCounts(page.snapshot, model)} stamp={model.stamp} stale={page.model.stale} initialActions={page.actions} finder={page.finder}>
      <ReviewDesk items={items} hrefs={hrefs as unknown as Record<string, string>} weekOf={weekOf} />
    </NightFrame>
  );
}

function readClock(): number {
  return Date.now();
}
