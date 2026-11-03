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
  const facts: { label: string; value: string }[] = [];
  if (item.channel) facts.push({ label: "Channel", value: item.channel });
  if (item.toLine) facts.push({ label: "To", value: item.toLine });
  if (item.waiting) facts.push({ label: "Waiting", value: item.waiting });
  if (item.drafted) facts.push({ label: "Drafted", value: item.drafted });
  return (
    <>
      <div className="lbl eyebrow">
        <a href={hrefs.today}>Today</a> / Needs you / {index + 1} of {total}
      </div>
      <div className="dgrid">
        <DecisionPane
          item={item}
          index={index}
          total={total}
          next={next ? { href: hrefs.decision(next.id), label: [next.name, next.org].filter(Boolean).join(", ") } : null}
        />
        <aside className="side">
          {facts.length ? (
            <div className="card">
              <div className="h lbl">Details</div>
              <dl className="dl">
                {facts.map((fact) => (
                  <span key={fact.label} style={{ display: "contents" }}>
                    <dt>{fact.label}</dt>
                    <dd>{fact.value}</dd>
                  </span>
                ))}
              </dl>
            </div>
          ) : null}
          {item.linked.length ? (
            <div className="card">
              <div className="h lbl">Linked records</div>
              {item.linked.map((link) => (
                <a className="linked" key={link.id} href={link.kind === "person" ? hrefs.person(link.id) : hrefs.deals}>
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
