"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { BotDesk, DeskBot, DeskFilter, RoutineView } from "@/lib/os/bot-desk";
import { botMatches, groupTeams } from "@/lib/os/bot-desk";
import type { OfficeData } from "@/lib/os/night";
import type { Interaction } from "@/lib/os/types";
import { officeStatus, whoLabel } from "@/lib/os/ask";
import { FlowView } from "./FlowView";
import { PixelOffice } from "./PixelOffice";
import { useNightActions } from "./NightFrame";

const DOT: Record<DeskBot["status"], string> = {
  "Needs Ryan": "is-need",
  Working: "is-work",
  Idle: "is-idle",
  Paused: "is-pause",
};


export function OfficeSwitch({
  desk,
  office,
  interactions,
  now,
  decisionRoot,
}: {
  desk: BotDesk;
  office: OfficeData;
  interactions: Interaction[];
  now: number;
  decisionRoot: string;
}) {
  const [choice, setChoice] = useState<"flow" | "list" | "map" | null>(null);
  const [filter, setFilter] = useState<DeskFilter | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const [feedAll, setFeedAll] = useState(false);
  const view = choice ?? "list";
  const visible = useMemo(() => desk.bots.filter((bot) => botMatches(bot, filter, query)), [desk.bots, filter, query]);
  const needs = visible.filter((bot) => bot.status === "Needs Ryan");
  const teams = groupTeams(visible);
  const problems = desk.routines.filter((routine) => routine.failed || routine.overdue);
  const rest = desk.routines.filter((routine) => !routine.failed && !routine.overdue);
  const feed = feedAll ? desk.feed : desk.feed.slice(0, 5);
  const openBot = desk.bots.find((bot) => bot.id === selected) ?? null;
  const { setAskContext } = useNightActions();
  useEffect(() => {
    setAskContext({
      page: "/os/bots",
      about: openBot?.id ?? null,
      requestedBy: null,
      botName: openBot?.name ?? null,
    });
  }, [openBot?.id, openBot?.name, setAskContext]);

  useEffect(() => {
    if (view !== "map") return;
    const id = window.requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    return () => window.cancelAnimationFrame(id);
  }, [view]);

  function toggleFilter(next: DeskFilter) {
    setFilter((current) => (current === next ? null : next));
    if (next === "stale" || next === "done" || next === "needs" || next === "working" || next === "idle" || next === "paused") {
      setChoice("list");
    }
  }

  if (!desk.bots.length && !office.bots.length) return <p className="t-body muted">No bots in this snapshot.</p>;

  return (
    <div className={openBot ? "bots-page is-open" : "bots-page"} data-view={view}>
      <Summary
        desk={desk}
        filter={filter}
        onFilter={toggleFilter}
        onRoutines={() => {
          setChoice("list");
          window.requestAnimationFrame(() => document.getElementById("bots-routines")?.scrollIntoView({ block: "start" }));
        }}
      />
      <div className="bots-toggle" role="group" aria-label="Office view">
        <button type="button" data-for="map" aria-pressed={view === "map"} onClick={() => setChoice("map")}>
          Map
        </button>
        <button type="button" data-for="flow" aria-pressed={view === "flow"} onClick={() => setChoice("flow")}>
          Flow
        </button>
        <button type="button" data-for="list" aria-pressed={view === "list"} onClick={() => setChoice("list")}>
          List
        </button>
      </div>
      <div className="bots-flow">
        <FlowView interactions={interactions} bots={desk.bots} now={now} active={view === "flow"} onOpenBot={setSelected} />
      </div>
      <div className="bots-list">
        {needs.length ? (
          <section className="bots-block" aria-labelledby="bots-needs-h">
            <h2 id="bots-needs-h" className="bots-h">Needs you</h2>
            <div className="bots-needs">
              {needs.map((bot) => (
                <article key={bot.id} className="bots-need">
                  <button type="button" className="bots-need-open" onClick={() => setSelected(bot.id)}>
                    <span className="bots-need-name">{bot.name}</span>
                    <Status bot={bot} />
                    {bot.result ? <span className="bots-need-result">{bot.result}</span> : null}
                  </button>
                  <When relative={bot.relative} ct={bot.ct} />
                  {bot.decision ? (
                    <a className="bots-decision" href={`${decisionRoot}/${encodeURIComponent(bot.decision.id)}`}>
                      {bot.decision.label}
                    </a>
                  ) : null}
                  <BotQuick name={bot.name} />
                </article>
              ))}
            </div>
          </section>
        ) : null}
        {desk.feed.length && !query && !filter ? (
          <section className="bots-block" aria-labelledby="bots-feed-h">
            <h2 id="bots-feed-h" className="bots-h">Today</h2>
            <ol className="bots-feed-list">
              {feed.map((item) => (
                <li key={item.key}>
                  <p>
                    <b>{item.name}</b> {item.sentence}
                  </p>
                  <When relative={item.relative} ct={item.ct} />
                </li>
              ))}
            </ol>
            {desk.feed.length > 5 ? (
              <button type="button" className="bots-more" onClick={() => setFeedAll((value) => !value)}>
                {feedAll ? "Show less" : "Show all"}
              </button>
            ) : null}
          </section>
        ) : null}
        <label className="bots-search-label">
          <span className="lbl">Search</span>
          <input className="bots-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, team, or result" aria-label="Search bots" autoComplete="off" />
        </label>
        {teams.length === 0 ? <p className="bots-empty">No bots match.</p> : null}
        {teams.map((team) => {
          const panelId = `team-${team.name.replace(/\s+/g, "-").toLowerCase()}`;
          const open = !closed[team.name];
          return (
            <section key={team.name} className="bots-block" aria-labelledby={`${panelId}-h`}>
              <h2 id={`${panelId}-h`}>
                <button type="button" className="bots-team" aria-expanded={open} aria-controls={panelId} onClick={() => setClosed((current) => ({ ...current, [team.name]: open }))}>
                  <span>{team.name}</span>
                  <span className="bots-team-n">{team.bots.length}</span>
                  <span aria-hidden>{open ? "▾" : "▸"}</span>
                </button>
              </h2>
              {open ? (
                <div id={panelId} className="bots-people">
                  {team.bots.map((bot) => (
                    <article key={bot.id} className="bots-person">
                      <button type="button" className="bots-person-open" onClick={() => setSelected(bot.id)}>
                        <span className="bots-person-top">
                          <span className="bots-person-name">{bot.name}</span>
                          <span className="bots-team-chip">{bot.team}</span>
                        </span>
                        <Status bot={bot} />
                      </button>
                      <When relative={bot.relative} ct={bot.ct} />
                      {bot.result ? (
                        <button
                          type="button"
                          className={expanded[bot.id] ? "bots-result is-open" : "bots-result"}
                          aria-expanded={Boolean(expanded[bot.id])}
                          onClick={() => setExpanded((current) => ({ ...current, [bot.id]: !current[bot.id] }))}
                        >
                          {bot.result}
                        </button>
                      ) : null}
                      {bot.usage != null ? <Usage value={bot.usage} /> : null}
                      {bot.director ? <p className="bots-director">Director · {bot.director}</p> : null}
                      <BotQuick name={bot.name} />
                    </article>
                  ))}
                </div>
              ) : null}
            </section>
          );
        })}
        {desk.routines.length ? (
          <section id="bots-routines" className="bots-block" aria-labelledby="bots-routines-h">
            <h2 id="bots-routines-h" className="bots-h">Routines</h2>
            {problems.length ? (
              <ul className="bots-routines">
                {problems.map((routine) => (
                  <RoutineRow key={`${routine.name}-${routine.status}`} routine={routine} />
                ))}
              </ul>
            ) : (
              <p className="bots-empty">None failed.</p>
            )}
            {rest.length ? (
              <details className="bots-rest">
                <summary>Other routines <span>{rest.length}</span></summary>
                <ul className="bots-routines">
                  {rest.map((routine) => (
                    <RoutineRow key={`${routine.name}-${routine.status}`} routine={routine} />
                  ))}
                </ul>
              </details>
            ) : null}
          </section>
        ) : null}
      </div>
      <div className="bots-map">
        {office.bots.length ? (
          <PixelOffice
            data={office}
            now={now}
            active={view === "map"}
            needs={desk.bots.filter((bot) => bot.status === "Needs Ryan").map((bot) => ({
              slug: bot.id,
              name: bot.name,
              href: bot.decision ? `${decisionRoot}/${encodeURIComponent(bot.decision.id)}` : null,
            }))}
            onOpenBot={setSelected}
          />
        ) : (
          <p className="t-body muted">No bots in this snapshot.</p>
        )}
      </div>
      {openBot ? <BotSheet bot={openBot} decisionRoot={decisionRoot} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

function Summary({
  desk,
  filter,
  onFilter,
  onRoutines,
}: {
  desk: BotDesk;
  filter: DeskFilter | null;
  onFilter: (filter: DeskFilter) => void;
  onRoutines: () => void;
}) {
  const counts = desk.summary;
  const row: { id: DeskFilter; label: string; count: number }[] = [
    { id: "needs", label: "Needs you", count: counts.needs },
    { id: "working", label: "Working", count: counts.working },
    { id: "done", label: "Done today", count: counts.doneToday },
  ];
  return (
    <div className="bots-summary">
      <div className="segment bots-sum" role="group" aria-label="Filter bots">
        {row.map((chip) => (
          <button key={chip.id} type="button" aria-pressed={filter === chip.id} onClick={() => onFilter(chip.id)}>
            <span>{chip.label}</span>
            <b className="num">{chip.count.toLocaleString("en-US")}</b>
          </button>
        ))}
      </div>
      {counts.failedRoutines > 0 ? (
        <button type="button" className="bots-failed" onClick={onRoutines}>
          {counts.failedRoutines.toLocaleString("en-US")} routines failed
        </button>
      ) : null}
    </div>
  );
}

function Status({ bot }: { bot: DeskBot }) {
  return (
    <span className="bots-status">
      <i className={`bots-dot ${DOT[bot.status]}`} aria-hidden />
      {bot.statusLabel}
    </span>
  );
}

function When({ relative, ct }: { relative: string | null; ct: string | null }) {
  const [open, setOpen] = useState(false);
  if (!relative && !ct) return null;
  if (!relative || !ct) return <span className="bots-when">{relative || ct}</span>;
  return (
    <button type="button" className="bots-when" title={ct} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      {open ? ct : relative}
    </button>
  );
}

function Usage({ value }: { value: number }) {
  const width = Math.max(0, Math.min(100, value));
  return (
    <span className="bots-usage">
      <span className="bots-usage-bar" aria-hidden>
        <span style={{ width: `${width}%` }} />
      </span>
      <span>{value}% of usage</span>
    </span>
  );
}

function RoutineRow({ routine }: { routine: RoutineView }) {
  return (
    <li className={routine.failed ? "is-failed" : routine.overdue ? "is-overdue" : ""}>
      <p>
        <b>{routine.name}</b>
        {routine.status ? <span> · {routine.status}</span> : null}
        {routine.overdue && !routine.failed ? <span> · Overdue</span> : null}
      </p>
      {routine.last ? <p className="bots-muted">Last {routine.last}</p> : null}
      {routine.next ? <p className="bots-muted">Next {routine.next}</p> : null}
      {routine.note ? <p>{routine.note}</p> : null}
    </li>
  );
}

function BotSheet({ bot, decisionRoot, onClose }: { bot: DeskBot; decisionRoot: string; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  useEffect(() => {
    closeRef.current?.focus();
    const wide = window.matchMedia("(min-width: 1101px)").matches;
    const previous = document.body.style.overflow;
    if (!wide) document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <>
      <button type="button" className="bots-sheet-back" aria-label="Close bot" onClick={onClose} />
      <aside className="bots-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <button ref={closeRef} type="button" className="bots-sheet-close" onClick={onClose}>
          Close
        </button>
        <h2 id={titleId} className="bots-sheet-name">{bot.name}</h2>
        <p className="bots-sheet-meta">
          {bot.team}
          {bot.role && bot.role.toLowerCase() !== bot.team.toLowerCase() ? ` · ${bot.role}` : ""}
        </p>
        <p className="bots-status">
          <i className={`bots-dot ${DOT[bot.status]}`} aria-hidden />
          {bot.statusLabel}
        </p>
        <When relative={bot.relative} ct={bot.ct} />
        {bot.result ? <p className="bots-sheet-result">{bot.result}</p> : null}
        <BotAsk name={bot.name} />
        <dl className="bots-sheet-facts">
          {bot.scope ? <Fact label="Scope" value={bot.scope} /> : null}
          {bot.director ? <Fact label="Director" value={bot.director} /> : null}
          {bot.registry ? <Fact label="Registry" value={bot.registry} /> : null}
          {bot.source ? <Fact label="Source" value={bot.source} /> : null}
          {bot.usage != null ? <Fact label="Usage" value={`${bot.usage}% of bot usage`} /> : null}
        </dl>
        {bot.decision ? (
          <a className="bots-decision" href={`${decisionRoot}/${encodeURIComponent(bot.decision.id)}`}>
            {bot.decision.label}
          </a>
        ) : null}
        {bot.routines.length ? (
          <>
            <h3 className="bots-h">Routines</h3>
            <ul className="bots-routines">
              {bot.routines.map((routine) => (
                <RoutineRow key={`${routine.name}-${routine.status}`} routine={routine} />
              ))}
            </ul>
          </>
        ) : null}
        {bot.handoffs.length ? (
          <>
            <h3 className="bots-h">Handoffs</h3>
            <ol className="bots-handoff-list">
              {bot.handoffs.map((item) => (
                <li key={`${item.at}-${item.direction}-${item.who}`}>
                  <When relative={item.relative} ct={item.ct} />
                  <p>
                    {item.direction} {item.who}
                    {` · ${item.kind}`}
                    {item.status ? ` · ${item.status}` : ""}
                  </p>
                  <p>{item.title}</p>
                </li>
              ))}
            </ol>
          </>
        ) : null}
      </aside>
    </>
  );
}

function BotQuick({ name }: { name: string }) {
  const { submit, actions } = useNightActions();
  const paused = [...actions].reverse().find((action) => action.target_id === name && (action.type === "bot_pause" || action.type === "bot_resume"));
  const holding = paused?.type === "bot_pause" && paused.status !== "failed";
  return (
    <div className="rate-row">
      <button
        type="button"
        className="btn"
        onClick={() => submit({ type: holding ? "bot_resume" : "bot_pause", target_id: name, payload: {}, label: `${holding ? "Resume" : "Pause"} ${name}.` })}
      >
        {holding ? "Resume" : "Pause"}
      </button>
    </div>
  );
}

function BotAsk({ name }: { name: string }) {
  const { submit, actions } = useNightActions();
  const [text, setText] = useState("");
  const latest = [...actions].reverse().find((action) => action.target_id === name && (action.type === "bot_request" || action.type === "bot_pause" || action.type === "bot_resume"));
  const status = latest ? officeStatus(latest, whoLabel(name)) : null;
  return (
    <div className="bot-ask">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const note = text.trim();
          if (!note) return;
          submit({ type: "bot_request", target_id: name, payload: { text: note }, label: `Asked ${name}.` });
          setText("");
        }}
      >
        <label className="note-field">
          <span className="lbl">Ask</span>
          <textarea aria-label={`Ask ${name}`} value={text} maxLength={2000} onChange={(event) => setText(event.target.value)} />
        </label>
        <button type="submit" className="btn" disabled={!text.trim()}>
          Ask
        </button>
      </form>
      <div className="rate-row">
        <button type="button" className="btn" onClick={() => submit({ type: "bot_pause", target_id: name, payload: {}, label: `Pause ${name}.` })}>
          Pause
        </button>
        <button type="button" className="btn" onClick={() => submit({ type: "bot_resume", target_id: name, payload: {}, label: `Resume ${name}.` })}>
          Resume
        </button>
      </div>
      <p className="hint">Pause and resume file a request. The office routes pause to the registry owner. This page does not change the bot.</p>
      {status ? (
        <p className="pickup">
          {status.line}
          {status.note ? ` ${status.note}` : ""}
        </p>
      ) : null}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}
