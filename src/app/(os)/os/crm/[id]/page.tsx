import type { Metadata } from "next";
import { PersonDesign } from "@/components/os/design/CrmDesign";
import { designPeople, type DesignPerson } from "@/lib/os/design-sample";
import { loadOsPage } from "@/lib/os/page-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Person | Backfield OS",
  robots: { index: false, follow: false },
};

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { hrefs, snapshot } = await loadOsPage();
  const people = snapshot?.crm.people.length
    ? snapshot.crm.people.map((person) => ({
        id: person.id,
        name: person.name,
        role: person.firm,
        firm: person.firm,
        domain: person.domain ?? null,
        why: person.notes,
        next: person.next_step,
        channel: person.last_touch_channel,
        events: [] as { when: string; text: string }[],
      }))
    : designPeople;
  const person = people.find((entry) => entry.id === decodeURIComponent(id)) ?? people[0];
  const decisionHref = person?.id === "kathleen-collins" ? `${hrefs.today === "/" ? "/d" : "/os/d"}/kathleen-linkedin` : null;
  if (!person) {
    return <PersonDesign person={emptyPerson()} todayHref={hrefs.today} crmHref={hrefs.crm} botsHref={hrefs.bots} decisionHref={null} />;
  }
  return <PersonDesign person={person} todayHref={hrefs.today} crmHref={hrefs.crm} botsHref={hrefs.bots} decisionHref={decisionHref} />;
}

function emptyPerson(): DesignPerson {
  return { id: "none", name: "No one in this snapshot", role: null, firm: null, domain: null, why: null, next: null, channel: null, events: [] };
}
