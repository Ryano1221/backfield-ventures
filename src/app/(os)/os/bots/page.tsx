import type { Metadata } from "next";
import { headers } from "next/headers";
import { NightFrame } from "@/components/os/night/NightFrame";
import { PixelOffice } from "@/components/os/night/PixelOffice";
import { isOsHost } from "@/lib/os/host";
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
  const model = buildToday(page.snapshot, page.actions);
  const office = buildOffice(page.snapshot, page.actions);
  return (
    <NightFrame onOs={isOsHost(host)} active="bots" counts={counts(page.snapshot, model)} stamp={model.stamp} stale={page.model.stale} initialActions={page.actions} finder={page.finder}>
      <div className="lbl eyebrow">Bots</div>
      <h1 className="d-xl">The office.</h1>
      <p className="t-body muted" style={{ margin: "12px 0 28px", maxWidth: 560 }}>
        {office.bots.length
          ? `${office.bots.length.toLocaleString("en-US")} bots at their desks. Handoffs replay from this snapshot.`
          : "The office fills in when the snapshot arrives."}
      </p>
      <PixelOffice data={office} />
    </NightFrame>
  );
}

function counts(snapshot: unknown, model: ReturnType<typeof buildToday>) {
  if (!snapshot) return { today: null, deals: null, people: null };
  return { today: model.ready.length + model.hold.length + model.open.length, deals: model.reviewingCount, people: model.peopleCount };
}
