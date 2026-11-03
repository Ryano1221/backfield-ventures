"use client";

import { useMemo, useState } from "react";
import type { PitchRow } from "@/lib/os/metrics";
import type { PitchStatus } from "@/lib/os/types";

const STATUS_LABEL: Record<PitchStatus, string> = {
  new: "New",
  reviewing: "Reviewing",
  passed: "Passed",
  advanced: "Advanced",
};

type Filter = "all" | "review" | PitchStatus;
type SortKey = "received" | "company" | "score" | "status";

export function DealFlow({ pitches }: { pitches: PitchRow[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sector, setSector] = useState("all");
  const [stage, setStage] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("received");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [open, setOpen] = useState<PitchRow | null>(null);

  const sectors = useMemo(() => unique(pitches.map((pitch) => pitch.sector)), [pitches]);
  const stages = useMemo(() => unique(pitches.map((pitch) => pitch.stage)), [pitches]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = pitches.filter((pitch) => {
      if (filter === "review" && pitch.status !== "new" && pitch.status !== "reviewing") return false;
      if (filter !== "all" && filter !== "review" && pitch.status !== filter) return false;
      if (sector !== "all" && pitch.sector !== sector) return false;
      if (stage !== "all" && pitch.stage !== stage) return false;
      if (!q) return true;
      return [pitch.company, pitch.founder, pitch.sector, pitch.source, pitch.stage]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
    return filtered.sort((a, b) => comparePitch(a, b, sortKey, sortDir));
  }, [pitches, query, filter, sector, stage, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "company" ? "asc" : "desc");
    }
  }

  if (pitches.length === 0) return <p className="os-missing">No pitches yet.</p>;

  return (
    <div>
      <div className="os-tools">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search company or founder"
          aria-label="Search pitches"
          autoComplete="off"
        />
        <select value={filter} onChange={(event) => setFilter(event.target.value as Filter)} aria-label="Status">
          <option value="all">All statuses</option>
          <option value="review">To review</option>
          <option value="new">New</option>
          <option value="reviewing">Reviewing</option>
          <option value="advanced">Advanced</option>
          <option value="passed">Passed</option>
        </select>
        <select value={sector} onChange={(event) => setSector(event.target.value)} aria-label="Sector">
          <option value="all">All sectors</option>
          {sectors.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select value={stage} onChange={(event) => setStage(event.target.value)} aria-label="Stage">
          <option value="all">All stages</option>
          {stages.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
      {rows.length === 0 ? <p className="os-missing">No pitches match.</p> : null}
      <div className="os-table-wrap">
        <table className="os-table">
          <caption className="os-sr">Deal flow</caption>
          <thead>
            <tr>
              <th>
                <button type="button" onClick={() => toggleSort("company")}>
                  Company {mark(sortKey, sortDir, "company")}
                </button>
              </th>
              <th>Sector</th>
              <th>Stage</th>
              <th>
                <button type="button" onClick={() => toggleSort("status")}>
                  Status {mark(sortKey, sortDir, "status")}
                </button>
              </th>
              <th>
                <button type="button" onClick={() => toggleSort("score")}>
                  Score {mark(sortKey, sortDir, "score")}
                </button>
              </th>
              <th>
                <button type="button" onClick={() => toggleSort("received")}>
                  Received {mark(sortKey, sortDir, "received")}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((pitch) => (
              <tr key={`${pitch.company}-${pitch.received}-${pitch.founder}`}>
                <td>
                  <button type="button" className="os-company" onClick={() => setOpen(pitch)}>
                    {pitch.company}
                  </button>
                </td>
                <td>{pitch.sector}</td>
                <td>{pitch.stage}</td>
                <td>
                  <span className={`os-chip os-chip-${pitch.status}`}>{STATUS_LABEL[pitch.status]}</span>
                </td>
                <td className="os-score">{pitch.score ?? "NA"}</td>
                <td>{pitch.receivedLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="os-cards">
        {rows.map((pitch) => (
          <button
            type="button"
            className="os-card"
            key={`${pitch.company}-${pitch.founder}-card`}
            onClick={() => setOpen(pitch)}
          >
            <div className="os-card-top">
              <span className="os-company">{pitch.company}</span>
              <span className={`os-chip os-chip-${pitch.status}`}>{STATUS_LABEL[pitch.status]}</span>
            </div>
            <p className="os-meta">
              {pitch.sector} · {pitch.stage} · {pitch.receivedLabel}
            </p>
            <p className="os-meta">
              {pitch.founder} · Score {pitch.score ?? "NA"}
            </p>
          </button>
        ))}
      </div>
      {open ? <PitchDrawer pitch={open} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}

function PitchDrawer({ pitch, onClose }: { pitch: PitchRow; onClose: () => void }) {
  const deck = safeHttp(pitch.deck);
  return (
    <>
      <button type="button" className="os-drawer-back" aria-label="Close details" onClick={onClose} />
      <aside className="os-drawer" role="dialog" aria-modal="true" aria-label={pitch.company}>
        <button type="button" className="os-btn" onClick={onClose} autoFocus>
          Close
        </button>
        <p className="os-kicker">Deal</p>
        <h3>{pitch.company}</h3>
        <span className={`os-chip os-chip-${pitch.status}`}>{STATUS_LABEL[pitch.status]}</span>
        <dl className="os-dl">
          <dt>Founder</dt>
          <dd>{pitch.founder}</dd>
          <dt>Sector</dt>
          <dd>{pitch.sector}</dd>
          <dt>Stage</dt>
          <dd>{pitch.stage}</dd>
          <dt>Score</dt>
          <dd>{pitch.score ?? "NA"}</dd>
          <dt>Source</dt>
          <dd>{pitch.source}</dd>
          <dt>Received</dt>
          <dd>{pitch.receivedLabel}</dd>
        </dl>
        {deck ? (
          <a className="os-btn os-btn-solid" href={deck} target="_blank" rel="noreferrer noopener">
            Open deck
          </a>
        ) : (
          <p className="os-missing">No deck link.</p>
        )}
      </aside>
    </>
  );
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function mark(active: SortKey, dir: "asc" | "desc", key: SortKey): string {
  if (active !== key) return "";
  return dir === "asc" ? "↑" : "↓";
}

function comparePitch(a: PitchRow, b: PitchRow, key: SortKey, dir: "asc" | "desc"): number {
  let delta = 0;
  if (key === "company") delta = a.company.localeCompare(b.company);
  else if (key === "received") delta = dateValue(a.received) - dateValue(b.received);
  else if (key === "status") delta = statusOrder(a.status) - statusOrder(b.status);
  else {
    if (a.score == null && b.score == null) delta = 0;
    else if (a.score == null) return 1;
    else if (b.score == null) return -1;
    else delta = a.score - b.score;
  }
  return dir === "asc" ? delta : -delta;
}

function statusOrder(status: PitchStatus): number {
  return { new: 0, reviewing: 1, advanced: 2, passed: 3 }[status];
}

function dateValue(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeHttp(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:") return url.toString();
  } catch {
    return null;
  }
  return null;
}
