"use client";

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
  const tiles = counts.filter((item) => !TAIL.has(item.stage) && (item.count > 0 || item.stageCount > 0));
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
      {counts.length ? (
        <>
          <div className="funnel" style={{ marginTop: 32 }}>
            {tiles.map((item) => (
              <div key={item.stage} className={WARM_STAGE.has(item.stage) ? "warmc" : ""}>
                <div className="lbl">{item.label}</div>
                <div className="v">{item.count.toLocaleString("en-US")}</div>
                {item.detail ? <div className="sub">{item.detail}</div> : null}
              </div>
            ))}
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
          <p className={`lbl muted funnel-check${covered ? "" : " is-off"}`}>
            {counted.toLocaleString("en-US")} of {total.toLocaleString("en-US")}
          </p>
        </>
      ) : null}
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
      <div className="filterbar">
        <input className="search" value={query} onChange={(event) => { setQuery(event.target.value); setShown(PAGE); }} placeholder={`Search ${total.toLocaleString("en-US")} people by name or firm`} aria-label="Search people" />
        <label className="lbl muted">
          Stage
          <select className="stage-select" value={stage} onChange={(event) => { setStage(event.target.value); setShown(PAGE); }} aria-label="Stage">
            <option value="all">Any</option>
            {counts.map((item) => (
              <option key={item.stage} value={item.stage}>{item.label}</option>
            ))}
          </select>
        </label>
        <span className="right lbl">Warm first, then latest touch</span>
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
                    <a className="co" href={hrefs.person(row.id)}>
                      <Logo name={row.firm || row.name} domain={row.domain} logoUrl={row.logoUrl} />
                      <div>
                        <div className="nm">{row.name}</div>
                        {row.firm ? <div className="o">{row.firm}</div> : null}
                      </div>
                    </a>
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
        <p className="t-body muted">No people match.</p>
      )}
      <p className="lbl muted" style={{ marginTop: 16 }}>
        Showing {visible.length.toLocaleString("en-US")} of {filtered.length.toLocaleString("en-US")}
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
