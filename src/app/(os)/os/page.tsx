import type { Metadata } from "next";
import { TodayDesign } from "@/components/os/design/TodayDesign";
import { designDeals, designDecisions } from "@/lib/os/design-sample";
import { explainDecision } from "@/lib/os/explain";
import { decisionKey } from "@/lib/os/decision-id";
import { loadOsPage } from "@/lib/os/page-data";
import type { Pitch } from "@/lib/os/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Today | Backfield OS",
  robots: { index: false, follow: false },
};

export default async function OsPage() {
  const { hrefs, snapshot } = await loadOsPage();
  const decisions = snapshot?.decisions.length ? snapshot.decisions : designDecisions;
  const deals = reviewDeals(snapshot?.pitches ?? []);
  const sample = !snapshot?.decisions.length;
  const detailBase = hrefs.today === "/" ? "/d" : "/os/d";
  return (
    <TodayDesign
      items={decisions.map((decision) => explainDecision(decision, decision.id || decisionKey(decision)))}
      deals={deals.length ? deals : designDeals}
      sample={sample}
      todayHref={hrefs.today}
      crmHref={hrefs.crm}
      botsHref={hrefs.bots}
      detailBase={detailBase}
    />
  );
}

function reviewDeals(pitches: Pitch[]): Pitch[] {
  return pitches.filter((pitch) => pitch.status === "new" || pitch.status === "reviewing");
}
