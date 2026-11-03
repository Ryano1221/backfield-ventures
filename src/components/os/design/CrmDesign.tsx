import Link from "next/link";
import { Mark } from "../Mark";
import { DesignFrame } from "./DesignFrame";
import type { DesignPerson } from "@/lib/os/design-sample";

export function CrmListDesign({
  people,
  sample,
  todayHref,
  crmHref,
  botsHref,
  personBase,
}: {
  people: DesignPerson[];
  sample: boolean;
  todayHref: string;
  crmHref: string;
  botsHref: string;
  personBase: string;
}) {
  return (
    <DesignFrame todayHref={todayHref} crmHref={crmHref} botsHref={botsHref} active="crm">
      {sample ? <p className="dx-banner">Design sample. One person from the live queue. No email was invented.</p> : null}
      <p className="dx-counts">
        <span>
          <strong>{people.length}</strong>
          {people.length === 1 ? " person in this view" : " people in this view"}
        </span>
      </p>
      <section className="dx-group">
        <h1>People</h1>
        <ul className="dx-deals">
          {people.map((person) => (
            <li key={person.id}>
              <Link href={`${personBase}/${encodeURIComponent(person.id)}`}>
                <Mark name={person.name} domain={person.domain} />
                <span>
                  <strong>{person.name}</strong>
                  <em>{person.role}</em>
                  <p>{person.why}</p>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </DesignFrame>
  );
}

export function PersonDesign({
  person,
  todayHref,
  crmHref,
  botsHref,
  decisionHref,
}: {
  person: DesignPerson;
  todayHref: string;
  crmHref: string;
  botsHref: string;
  decisionHref: string | null;
}) {
  return (
    <DesignFrame todayHref={todayHref} crmHref={crmHref} botsHref={botsHref} active="crm">
      <p className="dx-back">
        <Link href={crmHref}>Back to people</Link>
      </p>
      <article className="dx-card">
        <header className="dx-who">
          <Mark name={person.name} domain={person.domain} />
          <div>
            <h2>{person.name}</h2>
            <p className="dx-role">{person.role}</p>
          </div>
        </header>
        <h3>Who they are</h3>
        <p>{person.why}</p>
        <h3>What is next</h3>
        <p>{person.next}</p>
        <p className="dx-role">Channel: {person.channel}</p>
        {decisionHref ? (
          <div className="dx-actions">
            <Link className="dx-primary" href={decisionHref}>
              Open the reply
            </Link>
          </div>
        ) : null}
      </article>
      <section className="dx-group">
        <h1>What happened</h1>
        <ol className="dx-timeline">
          {person.events.map((event) => (
            <li key={event.when}>
              <strong>{event.when}</strong>
              <span>{event.text}</span>
            </li>
          ))}
        </ol>
      </section>
    </DesignFrame>
  );
}
