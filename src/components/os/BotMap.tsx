"use client";

import { useMemo, useState } from "react";
import type { MapDirector, MapEdge, MapHandoff, MapModel, OrgKey } from "@/lib/os/interactions";
import { displayParty, ORG_DIRECTORS } from "@/lib/os/interactions";

type Selection =
  | { kind: "node"; id: OrgKey | `bot:${string}` }
  | { kind: "edge"; from: OrgKey; to: OrgKey };

const KIND_LABEL = {
  packet: "Packet",
  amendment: "Amendment",
  result: "Result",
  message: "Message",
} as const;

export function BotMap({ map }: { map: MapModel }) {
  const [open, setOpen] = useState<OrgKey | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [feedCount, setFeedCount] = useState(8);
  const maxEdge = Math.max(1, ...map.edges.map((edge) => edge.count));
  const selected = useMemo(() => (selection ? map.feed.filter((item) => matches(item, selection)) : []), [map.feed, selection]);
  const lateral = map.edges.filter(
    (edge) => (ORG_DIRECTORS as readonly string[]).includes(edge.from) && (ORG_DIRECTORS as readonly string[]).includes(edge.to),
  );

  return (
    <div className="os-map-layout">
      <section className="os-map" aria-label="Bot map">
        <OrgCard
          title="Ryan"
          meta="CEO"
          traffic={map.ryan.traffic}
          selected={selection?.kind === "node" && selection.id === "ryan"}
          onSelect={() => setSelection({ kind: "node", id: "ryan" })}
        />
        <Spoke count={edgeCount(map.edges, "ryan", "executive")} max={maxEdge} />
        <OrgCard
          title={map.executive.lead?.name || "Executive"}
          meta={map.executive.lead ? map.executive.lead.status : "No executive in this snapshot"}
          traffic={map.executive.traffic}
          extra={memberLine(map.executive)}
          selected={selection?.kind === "node" && selection.id === "executive"}
          onSelect={() => setSelection({ kind: "node", id: "executive" })}
          onToggle={() => setOpen((value) => (value === "executive" ? null : "executive"))}
          expanded={open === "executive"}
          canToggle={map.executive.specialists.length > 0}
        />
        {open === "executive" ? <SpecialistList group={map.executive} onPick={(name) => setSelection({ kind: "node", id: `bot:${name}` })} /> : null}
        <div className="os-directors">
          {map.directors.map((director) => {
            const count = edgeCount(map.edges, "executive", director.key) + edgeCount(map.edges, "ryan", director.key);
            return (
            <article key={director.key} className="os-director">
              <span
                className={count ? "os-director-edge is-live" : "os-director-edge"}
                style={{ width: count ? 2 + Math.round((count / maxEdge) * 10) : 2 }}
                aria-hidden
              />
              <div className="os-director-body">
              <OrgCard
                title={director.label}
                meta={memberLine(director)}
                traffic={director.traffic}
                selected={selection?.kind === "node" && selection.id === director.key}
                onSelect={() => setSelection({ kind: "node", id: director.key })}
                onToggle={() => setOpen((value) => (value === director.key ? null : director.key))}
                expanded={open === director.key}
                canToggle={director.specialists.length > 0 || Boolean(director.lead)}
              />
              {open === director.key ? (
                <SpecialistList group={director} onPick={(name) => setSelection({ kind: "node", id: `bot:${name}` })} />
              ) : null}
              </div>
            </article>
            );
          })}
        </div>
        {lateral.length ? (
          <div className="os-lanes">
            <p className="os-kicker">Between directors, last 7 days</p>
            {lateral.map((edge) => (
              <EdgeButton key={`${edge.from}-${edge.to}`} edge={edge} max={maxEdge} onSelect={() => setSelection({ kind: "edge", from: edge.from, to: edge.to })} />
            ))}
          </div>
        ) : null}
        {map.other.lead || map.other.specialists.length ? (
          <article className="os-director os-other">
            <OrgCard
              title="Other"
              meta={`${map.other.specialists.length} without a director`}
              traffic={map.other.traffic}
              selected={selection?.kind === "node" && selection.id === "other"}
              onSelect={() => setSelection({ kind: "node", id: "other" })}
              onToggle={() => setOpen((value) => (value === "other" ? null : "other"))}
              expanded={open === "other"}
              canToggle={map.other.specialists.length > 0}
            />
            {open === "other" ? <SpecialistList group={map.other} onPick={(name) => setSelection({ kind: "node", id: `bot:${name}` })} /> : null}
          </article>
        ) : null}
        <div className="os-detail" aria-live="polite">
          {!map.hasInteractions ? <p className="os-missing">No handoffs in this snapshot.</p> : null}
          {map.hasInteractions && !selection ? <p className="os-quiet">Select a bot or a link to read its handoffs.</p> : null}
          {selection ? (
            <>
              <p className="os-kicker">{selectionLabel(selection, map)}</p>
              {selected.length === 0 ? (
                <p className="os-missing">No handoffs for this selection.</p>
              ) : (
                <HandoffList items={selected.slice(0, 12)} />
              )}
            </>
          ) : null}
        </div>
      </section>
      <section className="os-feed-panel" aria-label="Handoff feed">
        <h2>Handoffs</h2>
        {map.feed.length === 0 ? (
          <p className="os-missing">No handoffs in this snapshot.</p>
        ) : (
          <>
            <HandoffList items={map.feed.slice(0, feedCount)} />
            {map.feed.length > feedCount ? (
              <button type="button" className="os-more" onClick={() => setFeedCount((count) => count + 12)}>
                Show earlier
              </button>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}

function OrgCard({
  title,
  meta,
  traffic,
  extra,
  selected,
  onSelect,
  onToggle,
  expanded,
  canToggle,
}: {
  title: string;
  meta: string;
  traffic: number;
  extra?: string;
  selected: boolean;
  onSelect: () => void;
  onToggle?: () => void;
  expanded?: boolean;
  canToggle?: boolean;
}) {
  return (
    <div className={selected ? "os-org is-selected" : "os-org"}>
      <button type="button" className="os-org-main" onClick={onSelect}>
        <span className="os-org-title">{title}</span>
        <span className="os-quiet">{meta}</span>
        {extra ? <span className="os-quiet">{extra}</span> : null}
        <span className="os-kicker">{traffic} in 7 days</span>
      </button>
      {canToggle ? (
        <button type="button" className="os-org-toggle" aria-expanded={expanded} onClick={onToggle}>
          {expanded ? "Hide" : "Show"}
        </button>
      ) : null}
    </div>
  );
}

function SpecialistList({ group, onPick }: { group: MapDirector; onPick: (name: string) => void }) {
  return (
    <ul className="os-specialists">
      {group.specialists.map((bot) => (
        <li key={bot.name}>
          <button type="button" onClick={() => onPick(bot.name)}>
            <span>{bot.name}</span>
            <span className="os-quiet">{bot.status}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Spoke({ count, max }: { count: number; max: number }) {
  const width = count === 0 ? 1 : 2 + Math.round((count / max) * 8);
  return <span className={count ? "os-spoke is-live" : "os-spoke"} style={{ width }} />;
}

function EdgeButton({ edge, max, onSelect }: { edge: MapEdge; max: number; onSelect: () => void }) {
  const width = 16 + Math.round((edge.count / max) * 72);
  return (
    <button type="button" className="os-lane" onClick={onSelect}>
      <span>{labelOf(edge.from)} to {labelOf(edge.to)}</span>
      <span className="os-lane-bar" style={{ width }} />
      <span>{edge.count}</span>
    </button>
  );
}

function HandoffList({ items }: { items: MapHandoff[] }) {
  return (
    <ol className="os-handoffs">
      {items.map((item) => (
        <li key={`${item.timestamp}-${item.from}-${item.to}-${item.title}`}>
          <p className="os-kicker">
            {item.relative || item.timeLabel} · {KIND_LABEL[item.kind]}
            {item.status ? ` · ${item.status}` : ""}
          </p>
          <p className="os-handoff-title">{item.title}</p>
          <p className="os-quiet">
            {displayParty(item.from)} to {displayParty(item.to)}
          </p>
        </li>
      ))}
    </ol>
  );
}

function memberLine(group: MapDirector): string {
  const count = group.specialists.length + (group.lead ? 1 : 0);
  if (count === 0) return "No bots in this group";
  const bits = [`${count} ${count === 1 ? "bot" : "bots"}`];
  if (group.needs) bits.push(`${group.needs} need you`);
  if (group.failed) bits.push(`${group.failed} failing`);
  return bits.join(", ");
}

function edgeCount(edges: MapEdge[], a: OrgKey, b: OrgKey): number {
  return edges.find((edge) => (edge.from === a && edge.to === b) || (edge.from === b && edge.to === a))?.count ?? 0;
}

function matches(item: MapHandoff, selection: Selection): boolean {
  if (selection.kind === "edge") {
    const pair = [item.fromGroup, item.toGroup].sort().join("|");
    return pair === [selection.from, selection.to].sort().join("|") && item.fromGroup !== item.toGroup;
  }
  if (selection.id.startsWith("bot:")) {
    const name = selection.id.slice(4).toLowerCase();
    return item.from.toLowerCase() === name || item.to.toLowerCase() === name;
  }
  return item.fromGroup === selection.id || item.toGroup === selection.id;
}

function selectionLabel(selection: Selection, map: MapModel): string {
  if (selection.kind === "edge") return `${labelOf(selection.from)} and ${labelOf(selection.to)}`;
  if (selection.id.startsWith("bot:")) return selection.id.slice(4);
  if (selection.id === "ryan") return "Ryan";
  const group = [map.executive, map.ryan, map.other, ...map.directors].find((item) => item.key === selection.id);
  return group?.label || "Selection";
}

function labelOf(key: OrgKey): string {
  if (key === "other") return "Other";
  return displayParty(key);
}
