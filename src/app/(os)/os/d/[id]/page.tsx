import type { Metadata } from "next";
import Link from "next/link";
import { DecisionView } from "@/components/os/design/DecisionView";
import { DesignFrame } from "@/components/os/design/DesignFrame";
import { DecisionKeys } from "@/components/os/design/DecisionKeys";
import { designDecisions } from "@/lib/os/design-sample";
import { decisionKey } from "@/lib/os/decision-id";
import { explainDecision } from "@/lib/os/explain";
import { loadOsPage } from "@/lib/os/page-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Decision | Backfield OS",
  robots: { index: false, follow: false },
};

export default async function DecisionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { hrefs, snapshot } = await loadOsPage();
  const decisions = snapshot?.decisions.length ? snapshot.decisions : designDecisions;
  const items = decisions.map((decision) => explainDecision(decision, decision.id || decisionKey(decision)));
  const item = items.find((entry) => entry.id === decodeURIComponent(id)) ?? items[0];
  const detailBase = hrefs.today === "/" ? "/d" : "/os/d";
  if (!item) {
    return (
      <DesignFrame todayHref={hrefs.today} crmHref={hrefs.crm} botsHref={hrefs.bots} active="today">
        <p>That decision is not in this snapshot.</p>
      </DesignFrame>
    );
  }
  return (
    <DesignFrame todayHref={hrefs.today} crmHref={hrefs.crm} botsHref={hrefs.bots} active="today">
      <p className="dx-back">
        <Link href={hrefs.today}>Back to Today</Link>
      </p>
      <DecisionView item={item} />
      <DecisionKeys ids={items.map((entry) => entry.id)} current={item.id} base={detailBase} />
    </DesignFrame>
  );
}
