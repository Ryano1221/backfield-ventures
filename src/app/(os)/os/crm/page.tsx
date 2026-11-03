import type { Metadata } from "next";
import { CrmView } from "@/components/os/CrmView";
import { OsFrame } from "@/components/os/OsFrame";
import { loadOsPage } from "@/lib/os/page-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CRM | Backfield OS",
  robots: { index: false, follow: false },
};

export default async function CrmPage() {
  const { hrefs, snapshot, model, actions, finder } = await loadOsPage();
  return (
    <OsFrame
      active="crm"
      hrefs={hrefs}
      loginPath={hrefs.login}
      updated={model.relative || "Not yet"}
      updatedDetail={model.generatedLabel || "Waiting on the first ingest"}
      actions={actions}
      finder={finder}
    >
      <h1 className="os-page-title">CRM</h1>
      <CrmView people={snapshot?.crm.people ?? []} snapshot={snapshot} />
    </OsFrame>
  );
}
