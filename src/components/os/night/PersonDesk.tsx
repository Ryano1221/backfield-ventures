import type { PersonModel } from "@/lib/os/night";
import { Logo } from "./Logo";

export function PersonDesk({ person, peopleHref }: { person: PersonModel; peopleHref: string }) {
  return (
    <>
      <div className="lbl eyebrow">
        <a href={peopleHref}>People</a>
        {person.trackLabel ? ` / ${person.trackLabel}` : ""} / {person.name}
      </div>
      <div className="phead">
        <Logo key={person.id} name={person.firm || person.name} domain={person.domain} logoUrl={person.logoUrl} large />
        <div>
          <h1 className="d-l">{person.name}</h1>
          {person.tags.length ? (
            <div className="facts">
              {person.tags.map((tag) => (
                <span className={`tag${tag === person.stageLabel && person.stage && ["I'm in", "Replied", "Call asked"].includes(tag) ? " warm" : ""}`} key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="acts" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {person.email ? (
            <a className="btn" href={`mailto:${person.email}`}>
              Email
            </a>
          ) : null}
          {person.call && person.next ? (
            <a className="btn primary" href="#next">
              Prep for call →
            </a>
          ) : null}
        </div>
      </div>
      {person.next ? (
        <div className="next" id="next">
          <div>
            <div className="lbl">Next step</div>
            <div className="t">{person.nextWhen ? `${person.nextWhen}` : "Next"}</div>
            <p className="t-body" style={{ marginTop: 8 }}>{person.next}</p>
          </div>
        </div>
      ) : null}
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
              {person.email ? <><dt>Email</dt><dd>{person.email}</dd></> : null}
              {person.website ? <><dt>Website</dt><dd><a href={person.website}>{person.domain}</a></dd></> : null}
              {person.trackLabel ? <><dt>Track</dt><dd>{person.trackLabel}</dd></> : null}
              {person.owner ? <><dt>Owner</dt><dd>{person.owner}</dd></> : null}
              {person.last ? <><dt>Last touch</dt><dd>{person.last}</dd></> : null}
              {person.linkedin ? <><dt>Link</dt><dd><a href={person.linkedin}>{person.linkedin.replace(/^https?:\/\//, "")}</a></dd></> : null}
            </dl>
          </div>
        </aside>
      </div>
    </>
  );
}
