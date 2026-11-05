import type { Metadata } from "next";
import { headers } from "next/headers";
import { NightFrame } from "@/components/os/night/NightFrame";
import { RaiseDesk } from "@/components/os/night/RaiseDesk";
import { buildBotDesk } from "@/lib/os/bot-desk";
import { buildCommand } from "@/lib/os/command";
import { isOsHost } from "@/lib/os/host";
import { osChromeCounts } from "@/lib/os/nav";
import { buildToday } from "@/lib/os/night";
import { loadOsPage } from "@/lib/os/page-data";
import { readRaise } from "@/lib/os/raise";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Fund I | Backfield OS",
  robots: { index: false, follow: false },
};

export default async function RaisePage() {
  const page = await loadOsPage();
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const onOs = isOsHost(host);
  const now = readClock();
  const model = buildToday(page.snapshot, page.actions);
  const ledger = await readRaise();
  const command = buildCommand(page.snapshot, ledger, page.snapshot ? buildBotDesk(page.snapshot, page.actions, now) : null, now);
  const lps = (page.snapshot?.crm.people ?? []).filter((person) => person.lp).map((person) => ({ id: person.id, name: person.name, firm: person.firm }));
  return (
    <NightFrame onOs={onOs} active="raise" counts={osChromeCounts(page.snapshot, model)} stamp={model.stamp} stale={page.model.stale} initialActions={page.actions} finder={page.finder}>
      <RaiseDesk initial={ledger} funnel={command.funnel} chase={command.chase} lps={lps} personRoot={onOs ? "/crm" : "/os/crm"} />
    </NightFrame>
  );
}

function readClock(): number {
  return Date.now();
}
