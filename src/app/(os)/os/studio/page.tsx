import type { Metadata } from "next";
import { headers } from "next/headers";
import { NightFrame } from "@/components/os/night/NightFrame";
import { StudioDesk } from "@/components/os/studio/StudioDesk";
import { emailHrefs } from "@/lib/email/nav";
import { readDoc } from "@/lib/os/doc-store";
import { isOsHost } from "@/lib/os/host";
import { osChromeCounts, osHrefs } from "@/lib/os/nav";
import { buildToday } from "@/lib/os/night";
import { loadOsPage } from "@/lib/os/page-data";
import { parseStudio } from "@/lib/os/studio";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Content studio | Backfield OS",
  robots: { index: false, follow: false },
};

export default async function StudioPage() {
  const page = await loadOsPage();
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const onOs = isOsHost(host);
  const model = buildToday(page.snapshot, page.actions);
  const studio = parseStudio(await readDoc("content-studio").catch(() => null));
  const hrefs = osHrefs(onOs);
  const email = emailHrefs(onOs);
  return (
    <NightFrame onOs={onOs} active="email" counts={osChromeCounts(page.snapshot, model)} stamp={model.stamp} stale={page.model.stale} initialActions={page.actions} finder={page.finder}>
      <StudioDesk
        initial={studio}
        now={readClock()}
        engagement={page.snapshot?.warmups?.length ?? 0}
        hrefs={{ studio: hrefs.studio, email: email.dashboard, compose: email.compose, magnets: email.magnets, forms: email.forms, bots: hrefs.bots }}
      />
    </NightFrame>
  );
}

function readClock(): number {
  return Date.now();
}
