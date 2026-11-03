import type { Metadata } from "next";
import { Pipeline } from "@/components/os/Pipeline";
import { OsFrame } from "@/components/os/OsFrame";
import { loadOsPage } from "@/lib/os/page-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pipeline | Backfield OS",
  robots: { index: false, follow: false },
};

export default async function PipelinePage() {
  const { hrefs, model, actions, finder } = await loadOsPage();
  return (
    <OsFrame
      active="pipeline"
      hrefs={hrefs}
      loginPath={hrefs.login}
      updated={model.relative || "Not yet"}
      updatedDetail={model.generatedLabel || "Waiting on the first ingest"}
      actions={actions}
      finder={finder}
    >
      <h1 className="os-page-title">Pipeline</h1>
      <Pipeline pitches={model.pitches} />
    </OsFrame>
  );
}
