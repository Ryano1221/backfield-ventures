import type { Metadata } from "next";
import { headers } from "next/headers";
import { NightFrame } from "@/components/os/night/NightFrame";
import { StudioItem } from "@/components/os/studio/StudioItem";
import { readDoc } from "@/lib/os/doc-store";
import { isOsHost } from "@/lib/os/host";
import { osChromeCounts, osHrefs } from "@/lib/os/nav";
import { buildToday } from "@/lib/os/night";
import { loadOsPage } from "@/lib/os/page-data";
import { parseStudio } from "@/lib/os/studio";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Content | Backfield OS",
  robots: { index: false, follow: false },
};

export default async function StudioItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const page = await loadOsPage();
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const onOs = isOsHost(host);
  const model = buildToday(page.snapshot, page.actions);
  const studio = parseStudio(await readDoc("content-studio").catch(() => null));
  return (
    <NightFrame onOs={onOs} active="email" counts={osChromeCounts(page.snapshot, model)} stamp={model.stamp} stale={page.model.stale} initialActions={page.actions} finder={page.finder}>
      <StudioItem initial={studio} id={decodeURIComponent(id)} backHref={osHrefs(onOs).studio} />
    </NightFrame>
  );
}
