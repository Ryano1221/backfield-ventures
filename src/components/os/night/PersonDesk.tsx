import Link from "next/link";
import type { PersonModel } from "@/lib/os/night";
import { Logo } from "./Logo";
import { PersonActions } from "./PersonActions";

export function PersonDesk({ person, peopleHref }: { person: PersonModel; peopleHref: string }) {
  return (
    <>
      <div className="lbl eyebrow">
        <Link href={peopleHref} prefetch>People</Link>
        {person.trackLabel ? ` / ${person.trackLabel}` : ""} / {person.name}
      </div>
      <div className="phead">
        <Logo name={person.firm || person.name} domain={person.domain} logoUrl={person.logoUrl} large />
        <div>
          <h1 className="d-l">{person.name}</h1>
          {person.tags.length ? (
            <div className="facts">
              {person.tags.map((tag) => (
                <span className={`tag${tag === person.stageLabel && person.stage && ["I'm in", "Replied", "Call asked", "Call booked"].includes(tag) ? " warm" : ""}`} key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
          {person.next ? (
            <div className="next person-next" id="next">
              <div>
                <div className="lbl">{person.nextWhen ? `Next step · due ${person.nextWhen}` : "Next step"}</div>
                <p className="t">{person.next}</p>
              </div>
            </div>
          ) : null}
        </div>
        <PersonActions person={person} />
      </div>
      <div className="dgrid" style={{ marginTop: 48 }}>
        <div>
          {person.history.length ? (
            <div className="block" style={{ marginTop: 0 }}>
              <div className="lbl" style={{ marginBottom: 20 }}>History</div>
              <div className="tl">
                {person.history.map((event, index) => (
                  <div className={`e${event.kind === "next" ? " f" : ""}${event.kind === "key" ? " k" : ""}`} key={`${event.when}-${index}`}>
                    <div className="lbl when">{event.when}</div>
                    <div className="what">{event.what}</div>
                    {event.source ? <div className="src">{event.source}</div> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {person.notes ? (
            <div className="block">
              <div className="lbl" style={{ marginBottom: 10 }}>Notes</div>
              <div className="notes">{person.notes}</div>
            </div>
          ) : null}
        </div>
        <aside className="side">
          <div className="card">
            <div className="h lbl">About</div>
            <dl className="dl">
              {person.firm ? <><dt>Firm</dt><dd>{person.firm}</dd></> : null}
              {person.email ? (
            <>
              <dt>Email</dt>
              <dd>
                <a href={`mailto:${person.email}`}>{person.email}</a>
              </dd>
            </>
          ) : null}
              {person.website ? <><dt>Website</dt><dd><a href={person.website} target="_blank" rel="noopener noreferrer">{person.domain}</a></dd></> : null}
              {person.trackLabel ? <><dt>Track</dt><dd>{person.trackLabel}</dd></> : null}
              {person.owner ? <><dt>Owner</dt><dd>{person.owner}</dd></> : null}
              {person.last ? <><dt>Last touch</dt><dd>{person.last}</dd></> : null}
              {person.linkedin ? <><dt>Link</dt><dd><a href={person.linkedin} target="_blank" rel="noopener noreferrer">{person.linkedin.replace(/^https?:\/\//, "")}</a></dd></> : null}
            </dl>
          </div>
        </aside>
      </div>
    </>
  );
}
