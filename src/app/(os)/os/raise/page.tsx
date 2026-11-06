import type { Metadata } from "next";
import { headers } from "next/headers";
import { NightFrame } from "@/components/os/night/NightFrame";
import { RaiseDesk } from "@/components/os/night/RaiseDesk";
import { buildBotDesk } from "@/lib/os/bot-desk";
import { buildCommand, lpFunnel } from "@/lib/os/command";
import { EMPTY_LEDGER } from "@/lib/os/raise-model";
import { isOsHost } from "@/lib/os/host";
import { osChromeCounts, osHrefs } from "@/lib/os/nav";
import { buildToday } from "@/lib/os/night";
import { loadOsPage } from "@/lib/os/page-data";
import { readRaise } from "@/lib/os/raise";
import { readDoc } from "@/lib/os/doc-store";
import { diagnoseFunnel, parseFunnelHistory, weekDeltas } from "@/lib/os/funnel-history";
import { LpPipeline } from "@/components/os/night/LpPipeline";
import { FundTabs } from "@/components/os/night/FundTabs";
import { parseSpvs, spvBackers } from "@/lib/os/spv";
import { parseLeads } from "@/lib/os/warm-leads";
import { usd } from "@/lib/os/raise-model";
import { WarmLeads } from "@/components/os/night/WarmLeads";
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
  const spvBook = parseSpvs(await readDoc("spvs").catch(() => null));
  const spvOpen = spvBook.spvs.filter((spv) => spv.status !== "closed" && spv.status !== "cancelled").length;
  const leads = parseLeads(await readDoc("warm-leads").catch(() => null));
  const backers = spvBackers(spvBook);
  // Who to ask for two names: committed money first, then good calls.
  const candidates = [
    ...ledger.commitments.filter((row) => row.status !== "soft").map((row) => ({ name: row.name, person_id: row.person_id, why: `Committed ${usd(row.amount_usd)} to Fund I` })),
    ...backers.map((row) => ({ name: row.name, person_id: row.personId, why: `Backed ${row.spvs} ${row.spvs === 1 ? "SPV" : "SPVs"}` })),
    ...(page.snapshot?.crm.people ?? [])
      .filter((person) => person.im_in || ["im_in", "call_held"].includes((person.stage || "").toLowerCase()))
      .map((person) => ({ name: person.name, person_id: person.id, why: person.im_in || person.stage === "im_in" ? "Said I'm in" : "Good call" })),
  ];
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(now));
  return (
    <NightFrame onOs={onOs} active="raise" counts={osChromeCounts(page.snapshot, model)} stamp={model.stamp} stale={page.model.stale} initialActions={page.actions} finder={page.finder}>
      <FundTabs active="fund" fundHref={osHrefs(onOs).raise} spvHref={osHrefs(onOs).spv} spvCount={spvOpen} />
      <RaiseDesk initial={ledger} funnel={command.funnel} deltas={deltas} diagnosis={diagnosis} lps={lps} personRoot={onOs ? "/crm" : "/os/crm"} />
      <LpPipeline
        people={lpPeople.map((person) => ({ id: person.id, name: person.name, firm: person.firm, stage: person.stage, im_in: person.im_in, next_step: person.next_step, next_step_short: person.next_step_short, next_step_due: person.next_step_due }))}
        initial={pipeline}
        ledger={ledger}
        today={today}
        personRoot={onOs ? "/crm" : "/os/crm"}
      />
      <WarmLeads initial={leads} candidates={candidates} backers={backers} fundNames={ledger.commitments.map((row) => row.name)} personRoot={onOs ? "/crm" : "/os/crm"} />
    </NightFrame>
  );
}

function readClock(): number {
  return Date.now();
}
