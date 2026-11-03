"use client";

import { useEffect, useMemo, useState } from "react";
import type { DeskDeal, DeskDecision, TodayModel } from "@/lib/os/night";
import { osHrefs } from "@/lib/os/nav";
import { DecisionPane, DecisionRow } from "./DecisionPane";
import { Logo } from "./Logo";
import { useNightActions } from "./NightFrame";

export function TodayDesk({ model, onOs }: { model: TodayModel; onOs: boolean }) {
  const hrefs = osHrefs(onOs);
  const items = useMemo(() => [...model.ready, ...model.hold, ...model.open], [model]);
  const [current, setCurrent] = useState(0);
  const { enqueue } = useNightActions();
  const item = items[current] ?? null;
  const next = item && items[current + 1] ? items[current + 1] : items.length > 1 ? items[0] : null;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "j" || event.key === "ArrowDown") {
        event.preventDefault();
        setCurrent((index) => Math.min(items.length - 1, index + 1));
      } else if (event.key === "k" || event.key === "ArrowUp") {
        event.preventDefault();
        setCurrent((index) => Math.max(0, index - 1));
      } else if (event.key === "Enter" && item && !item.pending) {
        event.preventDefault();
        enqueue({
          type: "decide",
          target_id: item.id,
          payload: { choice: item.approveChoice },
          label: `Queued approval for ${item.name}. Nothing sends until the office acts.`,
        });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enqueue, item, items.length]);

  return (
    <>
      <div className="hero">
        <div>
          {model.weekday ? (
            <div className="lbl eyebrow">
              01 · <b>{model.weekday}</b>
            </div>
          ) : null}
          <h1 className="d-xl">
            {model.headline}
            {model.headlineDim ? (
              <>
                <br />
                <span className="dim">{model.headlineDim}</span>
              </>
            ) : null}
          </h1>
          {model.lede ? <p className="lede">{model.lede}</p> : null}
          {model.instruction ? <p className="t-body">{model.instruction}</p> : null}
        </div>
        {model.kpis.length ? (
          <div className="kpis">
            {model.kpis.map((kpi) => (
              <div className="kpi" key={kpi.label}>
                <div className="lbl">{kpi.label}</div>
                <div className="v">
                  {kpi.value}
                  {kpi.small ? <small>{kpi.small}</small> : null}
                </div>
                {kpi.sub ? <div className="s">{kpi.sub}</div> : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <section className="sec" style={{ marginTop: 0 }}>
        <div className="sec-h">
          <div>
            <div className="lbl">02 · Needs you</div>
            <h2 className="d-m">Decisions</h2>
          </div>
          {items.length ? <div className="tools"><span className="lbl muted">J / K to move · Enter to approve</span></div> : null}
        </div>
        {item ? (
          <div className="mfirst">
            <DecisionPane item={item} index={current} total={items.length} />
          </div>
        ) : (
          <p className="t-body muted">No decisions in this snapshot.</p>
        )}
        {items.length ? (
          <div className="split">
            <div className="list">
              <Group label="Ready to send" items={model.ready} all={items} current={current} onSelect={setCurrent} />
              <Group label="On hold" items={model.hold} all={items} current={current} onSelect={setCurrent} />
              <Group label="Open" items={model.open} all={items} current={current} onSelect={setCurrent} />
            </div>
            {item ? (
              <DecisionPane
                className="desk"
                item={item}
                index={current}
                total={items.length}
                next={next && next.id !== item.id ? { href: hrefs.decision(next.id), label: next.name } : null}
              />
            ) : null}
          </div>
        ) : null}
      </section>

      {model.waiting.length ? (
        <section className="sec">
          <div className="sec-h">
            <div>
              <div className="lbl">Bots waiting on you · {model.waiting.length}</div>
              <h2 className="d-m">In their words</h2>
            </div>
            <a className="btn sm" href={hrefs.bots}>
              Office →
            </a>
          </div>
          <div className="wait">
            {model.waiting.map((bot) => (
              <a className="br" href={hrefs.bots} key={bot.slug}>
                <div className="n">{bot.name}</div>
                <div className="s">{bot.ask}</div>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <section className="sec">
        <div className="sec-h">
          <div>
            <div className="lbl">03 · Deal desk</div>
            <h2 className="d-m">Deals in review</h2>
          </div>
          {model.pitchCount ? (
            <a className="btn sm" href={hrefs.deals}>
              All {model.pitchCount.toLocaleString("en-US")} pitches →
            </a>
          ) : null}
        </div>
        {model.deals.length ? <DealTable deals={model.deals} /> : <p className="t-body muted">No deals are in review.</p>}
      </section>
    </>
  );
}

function Group({
  label,
  items,
  all,
  current,
  onSelect,
}: {
  label: string;
  items: DeskDecision[];
  all: DeskDecision[];
  current: number;
  onSelect: (index: number) => void;
}) {
  if (!items.length) return null;
  return (
    <>
      <div className="grp lbl">
        <span>{label}</span>
        <span>{items.length}</span>
      </div>
      {items.map((item) => (
        <DecisionRow key={item.id} item={item} selected={all[current]?.id === item.id} onSelect={() => onSelect(all.findIndex((row) => row.id === item.id))} />
      ))}
    </>
  );
}

export function DealTable({ deals }: { deals: DeskDeal[] }) {
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>Company</th>
          <th className="hm">Sector</th>
          <th>Stage</th>
          <th>Score</th>
          <th>In review</th>
        </tr>
      </thead>
      <tbody>
        {deals.map((deal) => (
          <tr key={deal.company} id={`pitch:${deal.company}`}>
            <td>
              <div className="co">
                <Logo name={deal.company} domain={deal.domain} logoUrl={deal.logoUrl} />
                <div>
                  <div className="n">{deal.company}</div>
                  {deal.summary ? <div className="d clamp2">{deal.summary}</div> : null}
                </div>
              </div>
            </td>
            <td className="hm">{deal.sector || ""}</td>
            <td>{deal.stage ? <span className="tag">{deal.stage}</span> : null}</td>
            <td>{deal.pips == null ? <span className="lbl">Not scored</span> : <Pips n={deal.pips} />}</td>
            <td className="nw">{deal.waiting || ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Pips({ n }: { n: number }) {
  return (
    <span className="pips" aria-label={`${n} of 5`}>
      {Array.from({ length: 5 }, (_, index) => (
        <i key={index} className={index < n ? "on" : ""} />
      ))}
    </span>
  );
}
