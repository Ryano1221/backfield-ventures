import type { Metadata } from "next";
import { CrmListDesign } from "@/components/os/design/CrmDesign";
import { designPeople, type DesignPerson } from "@/lib/os/design-sample";
import { loadOsPage } from "@/lib/os/page-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CRM | Backfield OS",
  robots: { index: false, follow: false },
};

export default async function CrmPage() {
  const { hrefs, snapshot } = await loadOsPage();
  const people = snapshot?.crm.people.length ? snapshot.crm.people.map(toPerson) : designPeople;
  const personBase = hrefs.crm;
  return (
    <CrmListDesign
      people={people}
      sample={!snapshot?.crm.people.length}
      todayHref={hrefs.today}
      crmHref={hrefs.crm}
      botsHref={hrefs.bots}
      personBase={personBase}
    />
  );
}

function toPerson(person: { id: string; name: string; firm: string | null; track: string; notes: string | null; next_step: string | null; last_touch_channel: string | null; domain?: string }): DesignPerson {
  return {
    id: person.id,
    name: person.name,
    role: person.firm || person.track,
    firm: person.firm,
    domain: person.domain ?? null,
    why: person.notes || "No note was recorded for this person.",
    next: person.next_step || "No next step was recorded.",
    channel: person.last_touch_channel || "No channel recorded",
    events: [],
  };
}
