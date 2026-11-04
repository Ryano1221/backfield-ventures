"use client";

import type { DeskDecision } from "@/lib/os/night";
import { osHrefs } from "@/lib/os/nav";
import { DecisionPane } from "./DecisionPane";
import { Logo } from "./Logo";

export function DecisionDesk({
  item,
  index,
  total,
  next,
  onOs,
}: {
  item: DeskDecision;
  index: number;
  total: number;
  next: DeskDecision | null;
  onOs: boolean;
}) {
  const hrefs = osHrefs(onOs);
  return (
    <>
      <div className="lbl eyebrow">
        <a href={hrefs.today}>Today</a> / Needs you / {index + 1} of {total}
      </div>
      <div className="dgrid">
        <DecisionPane
          key={item.id}
          item={item}
          index={index}
          total={total}
          next={next ? { href: hrefs.decision(next.id), label: [next.name, next.org].filter(Boolean).join(", ") } : null}
        />
        <aside className="side">
          {item.personFacts.length ? (
            <div className="card">
              <div className="h lbl">Who they are</div>
              <dl className="dl">
                {item.personFacts.map((fact) => (
                  <span key={fact.label} style={{ display: "contents" }}>
                    <dt>{fact.label}</dt>
                    <dd>{fact.value}</dd>
                  </span>
                ))}
              </dl>
            </div>
          ) : null}
          {item.checks.length ? (
            <div className="card">
              <div className="h lbl">Checks</div>
              <div className="checks">
                {item.checks.map((check) => (
                  <div key={check}>{check}</div>
                ))}
              </div>
            </div>
          ) : null}
          {item.details.length ? (
            <div className="card">
              <details>
                <summary className="lbl">
                  <span>Details</span>
                  <span className="tap tap-closed">Tap to show +</span>
                  <span className="tap tap-open">Hide −</span>
                </summary>
                <dl className="dl">
                  {item.details.map((fact) => (
                    <span key={`${fact.label}:${fact.value}`} style={{ display: "contents" }}>
                      <dt>{fact.label}</dt>
                      <dd>{fact.value}</dd>
                    </span>
                  ))}
                </dl>
              </details>
            </div>
          ) : null}
          {item.linked.length ? (
            <div className="card">
              <div className="h lbl">Linked records</div>
              {item.linked.map((link) => (
                <a className="linked" key={`${link.kind}:${link.id}`} href={link.kind === "person" ? hrefs.person(link.id) : hrefs.deal(link.id)}>
                  <Logo name={link.name} domain={link.domain} logoUrl={link.logoUrl} />
                  <div>
                    <div className="n">{link.name}</div>
                    {link.detail ? <p className="clamp2">{link.detail}</p> : null}
                  </div>
                </a>
              ))}
            </div>
          ) : null}
        </aside>
      </div>
    </>
  );
}
