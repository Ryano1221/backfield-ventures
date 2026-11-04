import type { Metadata } from "next";
import { headers } from "next/headers";
import { NightFrame } from "@/components/os/night/NightFrame";
import { OfficeSwitch } from "@/components/os/night/OfficeSwitch";
import { isOsHost } from "@/lib/os/host";
import { osChromeCounts } from "@/lib/os/nav";
import { buildBotDesk } from "@/lib/os/bot-desk";
import { buildOffice, buildToday } from "@/lib/os/night";
import { loadOsPage } from "@/lib/os/page-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bots | Backfield OS",
  robots: { index: false, follow: false },
};

export default async function BotsPage() {
  const page = await loadOsPage();
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const onOs = isOsHost(host);
  const now = readClock();
  const model = buildToday(page.snapshot, page.actions);
  const office = buildOffice(page.snapshot, page.actions);
  const desk = buildBotDesk(page.snapshot, page.actions, now);
  return (
    <NightFrame onOs={onOs} active="bots" counts={osChromeCounts(page.snapshot, model)} stamp={model.stamp} stale={page.model.stale} initialActions={page.actions} finder={page.finder}>
      <div className="lbl eyebrow">Bots</div>
      <h1 className="d-xl">The office.</h1>
      {desk.bots.length ? (
        <p className="lede">
          {desk.bots.length.toLocaleString("en-US")} {desk.bots.length === 1 ? "bot" : "bots"}. {desk.summary.needs.toLocaleString("en-US")} {desk.summary.needs === 1 ? "is" : "are"} waiting on you.
        </p>
      ) : (
        <p className="t-body muted bots-lede">The office fills in when the snapshot arrives.</p>
      )}
      <OfficeSwitch desk={desk} office={office} interactions={page.snapshot?.interactions ?? []} now={now} decisionRoot={onOs ? "/d" : "/os/d"} />
    </NightFrame>
  );
}

function readClock(): number {
  return Date.now();
}
