"use client";

import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { OfficeBot, OfficeData } from "@/lib/os/night";
import { botActivity, botDetail, countLine, handoffRows, kindLabel, nameMap, rosterGroups, STATUS_COLOR } from "@/lib/os/roster";
import { PixelOffice } from "./PixelOffice";

export function OfficeSwitch({ data }: { data: OfficeData }) {
  const [view, setView] = useState<"list" | "map">("list");
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const closeSheet = useCallback(() => setSelected(null), []);
  const [shown, setShown] = useState(8);
  const names = useMemo(() => nameMap(data.bots), [data.bots]);
  const groups = useMemo(() => rosterGroups(data), [data]);
  const rows = useMemo(() => handoffRows(data.events, names), [data.events, names]);
  const openBot = data.bots.find((bot) => bot.slug === selected) ?? null;

  useEffect(() => {
    if (view !== "map") return;
    const id = window.requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    return () => window.cancelAnimationFrame(id);
  }, [view]);

  if (!data.bots.length) return <p className="t-body muted">No bots in this snapshot.</p>;

  return (
    <div className="bots-page" data-view={view}>
      <div className="bots-toggle" role="group" aria-label="Office view">
        <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}>
          List
        </button>
        <button type="button" aria-pressed={view === "map"} onClick={() => setView("map")}>
          Map
        </button>
      </div>
      <div className="bots-roster">
        {groups.map((group) => {
          const open = !closed[group.id];
          const panelId = `bots-${group.id.replace(/\s+/g, "-").toLowerCase()}`;
          return (
            <section key={group.id} className={group.id === "needs" ? "bots-group is-needs" : "bots-group"} aria-labelledby={`${panelId}-h`}>
              <h2 id={`${panelId}-h`}>
                <button
                  type="button"
                  className="bots-team"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => setClosed((current) => ({ ...current, [group.id]: open }))}
                >
                  <span className="bots-team-name">
                    {group.name}
                    <span className="bots-team-n">{group.bots.length}</span>
                  </span>
                  <span className="bots-team-counts">{countLine(group.counts)}</span>
                  <span className="bots-team-mark" aria-hidden>
                    {open ? "▾" : "▸"}
                  </span>
                </button>
              </h2>
              {open ? (
                <ul id={panelId} className="bots-rows">
                  {group.bots.map((bot) => {
                    const line = botActivity(bot, data.events, names);
                    return (
                      <li key={`${group.id}-${bot.slug}`}>
                        <button type="button" className="bots-row" onClick={() => setSelected(bot.slug)}>
                          <span className="bots-row-top">
                            <span className="bots-row-name">{bot.name}</span>
                            <span className="bots-status">
                              <i className="bots-dot" style={{ background: STATUS_COLOR[bot.status] }} aria-hidden />
                              {bot.statusLabel}
                            </span>
                          </span>
                          {line ? <span className="bots-row-line">{line}</span> : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </section>
          );
        })}
        <section className="ofc-card bots-handoffs" aria-label="Handoffs">
          <div className="h">
            <span>Handoffs</span>
            <span>{rows.length ? `${Math.min(shown, rows.length)} of ${rows.length}` : "0"}</span>
          </div>
          {rows.length === 0 ? (
            <p className="bots-empty">No handoffs in this snapshot.</p>
          ) : (
            <ol className="bots-feed">
              {rows.slice(0, shown).map((row) => (
                <li key={row.key} className="bots-fe">
                  <div className="t">
                    {row.day}
                    <br />
                    {row.time}
                  </div>
                  <div>
                    <div className="r">
                      <i className={`kd ${row.kind}`} />
                      <b>{row.from}</b> to <b>{row.to}</b>
                      {` · ${kindLabel(row.kind)}`}
                      {row.status ? ` · ${row.status.replace(/_/g, " ")}` : ""}
                    </div>
                    <div className="x">{row.title}</div>
                  </div>
                </li>
              ))}
            </ol>
          )}
          {rows.length > shown ? (
            <button type="button" className="bots-more" onClick={() => setShown((count) => count + 12)}>
              Show earlier
            </button>
          ) : null}
        </section>
      </div>
      <div className="bots-map">
        <PixelOffice data={data} />
      </div>
      {openBot ? <BotSheet bot={openBot} data={data} names={names} onClose={closeSheet} /> : null}
    </div>
  );
}

function BotSheet({
  bot,
  data,
  names,
  onClose,
}: {
  bot: OfficeBot;
  data: OfficeData;
  names: Map<string, string>;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const detail = botDetail(bot, data.events, names);
  useEffect(() => {
    closeRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
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
    <div className="ofc bots-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button ref={closeRef} type="button" className="bots-sheet-close" onClick={onClose}>
        Close
      </button>
      <div className="insp">
        <div className="nm" id={titleId}>
          {bot.name}
        </div>
        <div className="tm">
          {bot.team}
          {detail.role ? ` · ${detail.role}` : ""}
        </div>
        <div className="st">
          <i style={{ background: STATUS_COLOR[bot.status] }} aria-hidden />
          {bot.statusLabel}
        </div>
        {detail.rows.length ? (
          <dl>
            {detail.rows.map((row) => (
              <Fragment key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </Fragment>
            ))}
          </dl>
        ) : null}
        {detail.handoffs.length ? (
          <>
            <div className="rh">Recent handoffs</div>
            {detail.handoffs.map((item) => (
              <div className="ri" key={`${item.at}-${item.text}`}>
                <span>{item.at}</span>
                {item.text}
              </div>
            ))}
          </>
        ) : null}
      </div>
    </div>
  );
}
