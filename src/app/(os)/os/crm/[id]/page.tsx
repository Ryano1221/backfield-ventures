import type { Metadata } from "next";
import { headers } from "next/headers";
import { NightFrame } from "@/components/os/night/NightFrame";
import { PersonDesk } from "@/components/os/night/PersonDesk";
import { isOsHost } from "@/lib/os/host";
import { buildPerson, buildToday } from "@/lib/os/night";
import { osChromeCounts, osHrefs } from "@/lib/os/nav";
import { loadOsPage } from "@/lib/os/page-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Person | Backfield OS",
  robots: { index: false, follow: false },
};

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const page = await loadOsPage();
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const onOs = isOsHost(host);
  const model = buildToday(page.snapshot, page.actions);
  let key = id;
  try {
    key = decodeURIComponent(id);
  } catch {
    key = id;
  }
  const person = page.snapshot?.crm.people.find((row) => row.id === key) ?? null;
  return (
    <NightFrame onOs={onOs} active="people" counts={osChromeCounts(page.snapshot, model)} stamp={model.stamp} stale={page.model.stale} initialActions={page.actions} finder={page.finder}>
      {person && page.snapshot ? (
        <PersonDesk person={buildPerson(person, page.snapshot)} peopleHref={osHrefs(onOs).people} />
      ) : (
        <p className="t-body muted">That person is not in this snapshot.</p>
      )}
    </NightFrame>
  );
}
