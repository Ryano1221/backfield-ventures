"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { imInChipCount, rowsForStage, type PeopleRow, type StageCount } from "@/lib/os/night";
import { osHrefs } from "@/lib/os/nav";
import { Logo } from "./Logo";

const PAGE = 24;

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
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rowsForStage(rows, stage).filter((row) => {
      if (track === "lp") {
        if (!row.lp) return false;
      } else if (track !== "all" && row.track !== track) return false;
      if (!q) return true;
      return `${row.name} ${row.firm || ""}`.toLowerCase().includes(q);
    });
  }, [query, rows, stage, track]);
  const visible = filtered.slice(0, shown);
  const imInShown = imInChipCount(rows, track);
  const flag = counts.find((item) => item.stage === "im_in") ?? null;
  const splitFlag = Boolean(flag && flag.count !== flag.stageCount);

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
        filtered={filtered}
        visible={visible}
        imInShown={imInShown}
        splitFlag={splitFlag}
        counted={counted}
        setTrack={setTrack}
        setStage={setStage}
        setQuery={setQuery}
        setShown={setShown}
      />
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
  filtered,
  visible,
  imInShown,
  splitFlag,
  counted,
  setTrack,
  setStage,
  setQuery,
  setShown,
}: {
  hrefs: ReturnType<typeof osHrefs>;
  counts: StageCount[];
  tracks: { track: string; label: string; count: number }[];
  total: number;
  track: string;
  stage: string;
  query: string;
  shown: number;
  filtered: PeopleRow[];
  visible: PeopleRow[];
  imInShown: number;
  splitFlag: boolean;
  counted: number;
  setTrack: (value: string) => void;
  setStage: (value: string) => void;
  setQuery: (value: string) => void;
  setShown: (value: number | ((count: number) => number)) => void;
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
        <div className="segment scroll" role="group" aria-label="Stage">
          <button type="button" aria-pressed={stage === "all"} onClick={() => { setStage("all"); setShown(PAGE); }}>
            <span>All</span>
            <span className="num">{total.toLocaleString("en-US")}</span>
          </button>
          {counts.map((item) => {
            const value = item.stage === "im_in" ? imInShown : item.stageCount || item.count;
            return (
              <button key={item.stage} type="button" aria-pressed={stage === item.stage} onClick={() => { setStage(item.stage); setShown(PAGE); }}>
                <span>{item.label}</span>
                <span className="num">{value.toLocaleString("en-US")}</span>
              </button>
            );
          })}
        </div>
        {stage === "im_in" && splitFlag ? <p className="note">I&apos;m in is a flag across stages, not added to the stage total.</p> : null}
        {counted !== total ? <p className="note">Stage counts cover {counted.toLocaleString("en-US")} of {total.toLocaleString("en-US")}.</p> : null}
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
                  <td data-label="Stage">
                    <span className="stage-tags">
                      {row.stageLabel ? <span className={`tag${row.warm ? " warm" : ""}`}>{row.stageLabel}</span> : null}
                      {row.imIn && row.stage !== "im_in" ? <span className="tag warm">I&apos;m in</span> : null}
                    </span>
                  </td>
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
