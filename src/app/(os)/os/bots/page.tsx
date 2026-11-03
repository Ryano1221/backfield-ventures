import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { BotMap } from "@/components/os/BotMap";
import { OsFrame } from "@/components/os/OsFrame";
import { isOsAuthed } from "@/lib/os/current";
import { isOsHost } from "@/lib/os/host";
import { buildMap } from "@/lib/os/interactions";
import { buildDashboard } from "@/lib/os/metrics";
import { readSnapshot } from "@/lib/os/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bots | Backfield OS",
  robots: { index: false, follow: false },
};

export default async function BotsPage() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const onOs = isOsHost(host);
  if (!(await isOsAuthed())) redirect(onOs ? "/login" : "/os/login");
  const snapshot = await readSnapshot();
  const model = buildDashboard(snapshot);
  return (
    <OsFrame
      active="bots"
      homeHref={onOs ? "/" : "/os"}
      botsHref={onOs ? "/bots" : "/os/bots"}
      loginPath={onOs ? "/login" : "/os/login"}
      updated={model.relative || "Not yet"}
      updatedDetail={model.generatedLabel || "Waiting on the first ingest"}
    >
      <p className="os-lede-page">How work moves between Ryan, the executive, and the directors. Specialists stay folded until you open a group.</p>
      {!model.hasSnapshot ? <p className="os-empty-line">No snapshot yet.</p> : null}
      <BotMap map={buildMap(snapshot)} />
    </OsFrame>
  );
}