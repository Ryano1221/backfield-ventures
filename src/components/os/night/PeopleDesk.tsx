"use client";

import { useMemo, useState } from "react";
import type { PeopleRow } from "@/lib/os/night";
import { osHrefs } from "@/lib/os/nav";
import { Logo } from "./Logo";

const PAGE = 24;

export function PeopleDesk({
  rows,
  counts,
  tracks,
  total,
  warm,
  onOs,
}: {
  rows: PeopleRow[];
  counts: { stage: string; label: string; count: number }[];
  tracks: { track: string; label: string; count: number }[];
  total: number;
  warm: number;
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
      if (track !== "all" && row.track !== track) return false;
      if (stage !== "all" && row.stage !== stage) return false;
      if (!q) return true;
      return `${row.name} ${row.firm || ""}`.toLowerCase().includes(q);
    });
  }, [query, rows, stage, track]);
  const visible = filtered.slice(0, shown);

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
        <div className="funnel" style={{ marginTop: 32 }}>
          {counts.slice(0, 7).map((item) => (
            <div key={item.stage} className={item.stage === "im_in" || item.stage === "replied" || item.stage === "call_asked" ? "warmc" : ""}>
              <div className="lbl">{item.label}</div>
              <div className="v">{item.count.toLocaleString("en-US")}</div>
            </div>
          ))}
        </div>
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
          <select value={stage} onChange={(event) => { setStage(event.target.value); setShown(PAGE); }} aria-label="Stage" style={{ marginLeft: 8, background: "#000", color: "#f0ede8", border: "1px solid #333", height: 36 }}>
            <option value="all">Any</option>
            {counts.map((item) => (
              <option key={item.stage} value={item.stage}>{item.label}</option>
            ))}
          </select>
        </label>
        <span className="right lbl">Warm first, then latest touch</span>
      </div>
      {visible.length ? (
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
                <td>{row.trackLabel}</td>
                <td>{row.stageLabel ? <span className={`tag${row.warm ? " warm" : ""}`}>{row.stageLabel}</span> : null}</td>
                <td className="hm">{row.lastAge || row.last || ""}</td>
                <td className="nx">{row.next || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
