import type { Metadata } from "next";
import { Dashboard } from "@/components/os/Dashboard";
import { loadOsPage } from "@/lib/os/page-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Today | Backfield OS",
  robots: { index: false, follow: false },
};

export default async function OsPage() {
  const { hrefs, snapshot, model, actions, finder } = await loadOsPage();
  return (
    <Dashboard
      model={model}
      decisions={snapshot?.decisions ?? []}
      pitches={snapshot?.pitches ?? []}
      actions={actions}
      finder={finder}
      loginPath={hrefs.login}
      hrefs={hrefs}
    />
  );
}
