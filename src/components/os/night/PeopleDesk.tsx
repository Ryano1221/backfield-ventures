"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { PeopleRow, StageCount } from "@/lib/os/night";
import { osHrefs } from "@/lib/os/nav";
import { Logo } from "./Logo";

const PAGE = 24;
const TAIL = new Set(["hold", "bounced", "do_not_contact", "passed", "unknown"]);
const WARM_STAGE = new Set(["replied", "im_in", "call_asked", "call_booked"]);

export function PeopleDesk({
  rows,
  counts,
  tracks,
  total,
  warm,
  counted,
  onOs,
}: {
  rows: PeopleRow[];
  counts: StageCount[];
  tracks: { track: string; label: string; count: number }[];
  total: number;
  warm: number;
  counted: number;
  onOs: boolean;
}) {
  const hrefs = osHrefs(onOs);
  const [track, setTrack] = useState("all");
  const [stage, setStage] = useState("all");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [stageOpen, setStageOpen] = useState(false);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (track === "lp") {
        if (!row.lp) return false;
      } else if (track !== "all" && row.track !== track) return false;
      if (stage === "im_in") {
        if (!row.imIn) return false;
      } else if (stage !== "all" && row.stage !== stage) return false;
      if (!q) return true;
      return `${row.name} ${row.firm || ""}`.toLowerCase().includes(q);
    });
  }, [query, rows, stage, track]);
  const visible = filtered.slice(0, shown);
  const flag = counts.find((item) => item.stage === "im_in") ?? null;
  const splitFlag = Boolean(flag && flag.count !== flag.stageCount);
  const flagNames = splitFlag ? rows.filter((row) => row.imIn).map((row) => row.name) : [];
  const tiles = counts.filter((item) => {
    if (TAIL.has(item.stage)) return false;
    if (item.stage === "im_in" && splitFlag) return item.stageCount > 0;
    return item.count > 0 || item.stageCount > 0;
  });
  const rest = counts.filter((item) => TAIL.has(item.stage) && item.stageCount > 0);
  const other = rest.reduce((sum, item) => sum + item.stageCount, 0);
  const covered = counted === total;

  return (
    <>
      <div className="eyebrow lbl">People · CRM</div>
      <h1 className="d-xl">
        {total.toLocaleString("en-US")} {total === 1 ? "person." : "people."}
        {warm ? (
          <>
            <br />
            <span className="dim">{warm.toLocaleString("en-US")} {warm === 1 ? "is" : "are"} warm.</span>
          </>
        ) : null}
      </h1>
      <PeopleList
        hrefs={hrefs}
        counts={counts}
        tracks={tracks}
        total={total}
        track={track}
        stage={stage}
        query={query}
        shown={shown}
        stageOpen={stageOpen}
        filtered={filtered}
        visible={visible}
        setTrack={setTrack}
        setStage={setStage}
        setQuery={setQuery}
        setShown={setShown}
        setStageOpen={setStageOpen}
      />
      {splitFlag && flag ? (
        <div className="kpi flag">
          <div>
            <div className="lbl">I&apos;m in · flag</div>
            <div className="v">{flag.count.toLocaleString("en-US")}</div>
          </div>
          <div>
            {flagNames.length ? <div className="names">{flagNames.slice(0, 4).join(", ")}{flagNames.length > 4 ? ` and ${(flagNames.length - 4).toLocaleString("en-US")} more` : ""}</div> : null}
            <div className="d">Said I&apos;m in. Counted by flag across stages, not added to the stage total.</div>
          </div>
        </div>
      ) : null}
      {counts.length ? (
        <>
          <div className="lbl stage-note">Stages · each person counted once</div>
          <div className="funnel">
            {tiles.map((item) => {
              const value = item.stage === "im_in" && splitFlag ? item.stageCount : item.count;
              const label = item.stage === "im_in" && splitFlag ? "I'm in (stage)" : item.label;
              const detail = item.stage === "im_in" && splitFlag ? "Stage only. Flag count is above." : item.detail;
              return (
                <div key={item.stage} className={WARM_STAGE.has(item.stage) ? "warmc" : ""}>
                  <div className="lbl">{label}</div>
                  <div className="v">{value.toLocaleString("en-US")}</div>
                  {detail ? <div className="sub">{detail}</div> : null}
                </div>
              );
            })}
            {rest.length ? (
              <div className="span">
                <div className="lbl">Other</div>
                <div className="v">{other.toLocaleString("en-US")}</div>
                <ul className="bits">
                  {rest.map((item) => (
                    <li key={item.stage}>
                      {item.label} <b>{item.stageCount.toLocaleString("en-US")}</b>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          <p className={`lbl funnel-check${covered ? "" : " is-off"}`}>
            Stage tiles sum to <b>{counted.toLocaleString("en-US")} of {total.toLocaleString("en-US")}</b>
          </p>
        </>
      ) : null}
    </>
  );
}

function PeopleList({
  hrefs,
  counts,
  tracks,
  total,
  track,
  stage,
  query,
  shown,
  stageOpen,
  filtered,
  visible,
  setTrack,
  setStage,
  setQuery,
  setShown,
  setStageOpen,
}: {
  hrefs: ReturnType<typeof osHrefs>;
  counts: StageCount[];
  tracks: { track: string; label: string; count: number }[];
  total: number;
  track: string;
  stage: string;
  query: string;
  shown: number;
  stageOpen: boolean;
  filtered: PeopleRow[];
  visible: PeopleRow[];
  setTrack: (value: string) => void;
  setStage: (value: string) => void;
  setQuery: (value: string) => void;
  setShown: (value: number | ((count: number) => number)) => void;
  setStageOpen: (value: boolean) => void;
}) {
  return (
    <>
      <div className="tabs">
        <button type="button" className={track === "all" ? "on" : ""} onClick={() => { setTrack("all"); setShown(PAGE); }}>
          All {total.toLocaleString("en-US")}
        </button>
        {tracks.map((item) => (
          <button type="button" key={item.track} className={track === item.track ? "on" : ""} onClick={() => { setTrack(item.track); setShown(PAGE); }}>
            {item.label}
            <span>{item.count.toLocaleString("en-US")}</span>
          </button>
        ))}
      </div>
      <div className="card">
      <div className="filterbar">
        <input className="pill" value={query} onChange={(event) => { setQuery(event.target.value); setShown(PAGE); }} placeholder="Search people" aria-label="Search people" />
        <button type="button" className="who-chip" aria-expanded={stageOpen} onClick={() => setStageOpen(true)}>
          {stage === "all" ? "Any stage" : counts.find((item) => item.stage === stage)?.label || stage}
        </button>
        {stageOpen ? (
          <div className="who-sheet" role="dialog" aria-label="Stage">
            <button type="button" className="sheet-scrim" aria-label="Close" onClick={() => setStageOpen(false)} />
            <div className="who-card">
              <div className="sheet-handle" aria-hidden />
              <button type="button" aria-pressed={stage === "all"} onClick={() => { setStage("all"); setShown(PAGE); setStageOpen(false); }}>
                Any stage
              </button>
              {counts.map((item) => (
                <button key={item.stage} type="button" aria-pressed={stage === item.stage} onClick={() => { setStage(item.stage); setShown(PAGE); setStageOpen(false); }}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      {visible.length ? (
        <div className="tbl-scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th>Person</th>
                <th>Track</th>
                <th>Stage</th>
                <th className="hm">Last touch</th>
                <th>Next step</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Link className="co" href={hrefs.person(row.id)} prefetch>
                      <Logo name={row.firm || row.name} domain={row.domain} logoUrl={row.logoUrl} />
                      <div>
                        <div className="nm">{row.name}</div>
                        {row.firm ? <div className="o">{row.firm}</div> : null}
                      </div>
                    </Link>
                  </td>
                  <td data-label="Track">{row.trackLabel}</td>
                  <td data-label="Stage">{row.stageLabel ? <span className={`tag${row.warm ? " warm" : ""}`}>{row.stageLabel}</span> : null}</td>
                  <td className="hm" data-label="Last touch">{row.lastAge || row.last || ""}</td>
                  <td className="nx" data-label="Next step">{row.next || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="t-body muted" style={{ padding: "16px 18px" }}>No people match.</p>
      )}
      </div>
      <p className="note">
        Warm first, then latest touch. Showing {visible.length.toLocaleString("en-US")} of {filtered.length.toLocaleString("en-US")}
        {shown < filtered.length ? (
          <>
            {" "}
            <button type="button" className="btn sm" onClick={() => setShown((count) => count + PAGE)}>
              Show more
            </button>
          </>
        ) : null}
      </p>
    </>
  );
}
