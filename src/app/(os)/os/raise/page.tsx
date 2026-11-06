import type { Metadata } from "next";
import { headers } from "next/headers";
import { NightFrame } from "@/components/os/night/NightFrame";
import { RaiseDesk } from "@/components/os/night/RaiseDesk";
import { buildBotDesk } from "@/lib/os/bot-desk";
import { buildCommand, lpFunnel } from "@/lib/os/command";
import { EMPTY_LEDGER } from "@/lib/os/raise-model";
import { isOsHost } from "@/lib/os/host";
import { osChromeCounts } from "@/lib/os/nav";
import { buildToday } from "@/lib/os/night";
import { loadOsPage } from "@/lib/os/page-data";
import { readRaise } from "@/lib/os/raise";
import { readDoc } from "@/lib/os/doc-store";
import { diagnoseFunnel, parseFunnelHistory, weekDeltas } from "@/lib/os/funnel-history";
import { LpPipeline } from "@/components/os/night/LpPipeline";
import { parsePipeline } from "@/lib/os/lp-pipeline";

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
  const funnelHistory = parseFunnelHistory(await readDoc("funnel-history").catch(() => null));
  // History is CRM-only, so compare like with like.
  const deltas = page.snapshot ? weekDeltas(funnelHistory, lpFunnel(page.snapshot, EMPTY_LEDGER), now) : null;
  const diagnosis = diagnoseFunnel(command.funnel);
  const lpPeople = (page.snapshot?.crm.people ?? []).filter((person) => person.lp);
  const lps = lpPeople.map((person) => ({ id: person.id, name: person.name, firm: person.firm }));
  const pipeline = parsePipeline(await readDoc("lp-pipeline").catch(() => null));
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(now));
  return (
    <NightFrame onOs={onOs} active="raise" counts={osChromeCounts(page.snapshot, model)} stamp={model.stamp} stale={page.model.stale} initialActions={page.actions} finder={page.finder}>
      <RaiseDesk initial={ledger} funnel={command.funnel} deltas={deltas} diagnosis={diagnosis} chase={command.chase} lps={lps} personRoot={onOs ? "/crm" : "/os/crm"} />
      <LpPipeline
        people={lpPeople.map((person) => ({ id: person.id, name: person.name, firm: person.firm, stage: person.stage, im_in: person.im_in, next_step: person.next_step, next_step_short: person.next_step_short, next_step_due: person.next_step_due }))}
        initial={pipeline}
        ledger={ledger}
        today={today}
        personRoot={onOs ? "/crm" : "/os/crm"}
      />
    </NightFrame>
  );
}

function readClock(): number {
  return Date.now();
}
