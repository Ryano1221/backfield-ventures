"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { viewPeople } from "@/lib/os/overlays";
import type { CrmPerson, Snapshot } from "@/lib/os/types";
import { personTimeline } from "@/lib/os/crm";
import { displayParty } from "@/lib/os/interactions";
import { Mark } from "./Mark";
import { useOsActions } from "./OsShell";

const TRACKS = [
  ["investor", "Investor"],
  ["family_office", "Family office"],
  ["athlete", "Athlete"],
  ["creator", "Creator"],
  ["real_estate", "Real estate"],
  ["lp", "LP"],
  ["founder", "Founder"],
  ["other", "Other"],
] as const;

type SortKey = "name" | "firm" | "track" | "stage" | "owner" | "last" | "email";

export function CrmView({ people, snapshot }: { people: CrmPerson[]; snapshot: Snapshot | null }) {
  const { actions, enqueue, enqueueMany, paletteOpen } = useOsActions();
  const viewed = useMemo(() => viewPeople(people, actions).filter((person) => !person.snoozed), [people, actions]);
  const [query, setQuery] = useState("");
  const [track, setTrack] = useState("all");
  const [stage, setStage] = useState("all");
  const [owner, setOwner] = useState("all");
  const [touch, setTouch] = useState("all");
  const [email, setEmail] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<string[]>([]);
  const [cursor, setCursor] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const [dnc, setDnc] = useState<string | null>(null);
  const [bulkStage, setBulkStage] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const stages = useMemo(() => unique(viewed.map((person) => person.stage || "")), [viewed]);
  const owners = useMemo(() => unique(viewed.map((person) => person.owner || "")), [viewed]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = viewed.filter((person) => {
      if (track !== "all" && person.track !== track) return false;
      if (stage === "__none" && person.stage) return false;
      if (stage !== "all" && stage !== "__none" && person.stage !== stage) return false;
      if (owner === "__none" && person.owner) return false;
      if (owner !== "all" && owner !== "__none" && person.owner !== owner) return false;
      if (email === "yes" && !person.email) return false;
      if (email === "no" && person.email) return false;
      if (!matchesTouch(person.last_touch_at, touch)) return false;
      if (!q) return true;
      return [person.name, person.firm || "", person.email || "", person.owner || ""].join(" ").toLowerCase().includes(q);
    });
    return filtered.sort((a, b) => compare(a, b, sortKey, sortDir));
  }, [viewed, query, track, stage, owner, email, touch, sortKey, sortDir]);
  const person = viewed.find((item) => item.id === open) ?? null;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (paletteOpen || event.metaKey || event.ctrlKey || event.altKey) return;
      const tag = (event.target as HTMLElement | null)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if (event.key === "/" && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (typing) return;
      if (event.key === "j" || event.key === "k") {
        event.preventDefault();
        setCursor((current) => {
          const next = Math.max(0, Math.min(rows.length - 1, current + (event.key === "j" ? 1 : -1)));
          document.querySelector(`[data-crm-row="${next}"]`)?.scrollIntoView({ block: "nearest" });
          return next;
        });
      }
      if (event.key === "e" && rows[cursor]) setOpen(rows[cursor].id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteOpen, rows, cursor]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  if (people.length === 0) return <p className="os-missing">No people in this snapshot.</p>;

  return (
    <div>
      <p className="os-fine">/ search, j and k move, e edit.</p>
      <div className="os-tools">
        <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, firm, email" aria-label="Search people" />
        <select value={track} onChange={(event) => setTrack(event.target.value)} aria-label="Track">
          <option value="all">All tracks</option>
          {TRACKS.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select value={stage} onChange={(event) => setStage(event.target.value)} aria-label="Stage">
          <option value="all">All stages</option>
          <option value="__none">No stage</option>
          {stages.filter(Boolean).map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <select value={owner} onChange={(event) => setOwner(event.target.value)} aria-label="Owner">
          <option value="all">All owners</option>
          <option value="__none">No owner</option>
          {owners.filter(Boolean).map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <select value={touch} onChange={(event) => setTouch(event.target.value)} aria-label="Last touch">
          <option value="all">Any last touch</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="none">No last touch</option>
        </select>
        <select value={email} onChange={(event) => setEmail(event.target.value)} aria-label="Email">
          <option value="all">Email any</option>
          <option value="yes">Has email</option>
          <option value="no">No email</option>
        </select>
      </div>
      {selected.length ? (
        <div className="os-choice-row os-bulk">
          <span className="os-quiet">{selected.length} selected</span>
          <input value={bulkStage} onChange={(event) => setBulkStage(event.target.value)} placeholder="Stage" aria-label="Bulk stage" />
          <button
            type="button"
            disabled={!bulkStage.trim()}
            onClick={() => {
              enqueueMany(
                selected.map((id) => ({ type: "crm_stage" as const, target_id: id, payload: { stage: bulkStage.trim() }, label: "Stage updated." })),
                `Stage set for ${selected.length}.`,
              );
              setSelected([]);
            }}
          >
            Set stage
          </button>
          <button
            type="button"
            onClick={() => {
              enqueueMany(
                selected.map((id) => ({ type: "crm_hold" as const, target_id: id, payload: { hold: true }, label: "Hold queued." })),
                `Holding ${selected.length}.`,
              );
              setSelected([]);
            }}
          >
            Hold
          </button>
        </div>
      ) : null}
      {rows.length === 0 ? <p className="os-missing">No people match.</p> : null}
      <div className="os-table-wrap">
        <table className="os-table">
          <thead>
            <tr>
              <th />
              <Sort label="Name" k="name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <Sort label="Firm" k="firm" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <Sort label="Track" k="track" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <Sort label="Stage" k="stage" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <Sort label="Owner" k="owner" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <Sort label="Last touch" k="last" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <Sort label="Email" k="email" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
            </tr>
          </thead>
          <tbody>
            {rows.map((item, index) => (
              <tr key={item.id} data-crm-row={index} className={cursor === index ? "is-current" : undefined} onClick={() => setOpen(item.id)}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.includes(item.id)}
                    aria-label={`Select ${item.name}`}
                    onClick={(event) => event.stopPropagation()}
                    onChange={() => toggle(item.id)}
                  />
                </td>
                <td>
                  <span className="os-name-cell">
                    <Mark name={item.firm || item.name} domain={item.domain} logoUrl={item.logo_url} />
                    <button type="button" className="os-company" onClick={(event) => { event.stopPropagation(); setOpen(item.id); }}>{item.name}</button>
                  </span>
                  {item.badge ? <span className="os-chip">{item.badge}</span> : null}
                  {item.held ? <span className="os-chip">Hold</span> : null}
                  {item.dnc ? <span className="os-chip">Do not contact</span> : null}
                </td>
                <td>{item.firm || ""}</td>
                <td>{labelTrack(item.track)}</td>
                <td>{item.stage || ""}</td>
                <td>{item.owner || ""}</td>
                <td>{item.last_touch_at ? item.last_touch_at.slice(0, 10) : ""}</td>
                <td>{item.email ? "Yes" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {person ? (
        <PersonDrawer
          person={person}
          snapshot={snapshot}
          onClose={() => setOpen(null)}
          onDnc={() => setDnc(person.id)}
        />
      ) : null}
      {dnc ? (
        <div className="os-modal" role="dialog" aria-modal="true" aria-labelledby="dnc-title">
          <div className="os-modal-card">
            <h2 id="dnc-title">Do not contact</h2>
            <p>This records a do-not-contact request. Nothing is emailed or posted.</p>
            <div className="os-choice-row">
              <button
                type="button"
                className="os-danger"
                onClick={() => {
                  const name = viewed.find((item) => item.id === dnc)?.name || "this person";
                  enqueue({ type: "crm_dnc", target_id: dnc, payload: { dnc: true }, label: `Do not contact ${name}.` });
                  setDnc(null);
                }}
              >
                Do not contact
              </button>
              <button type="button" className="os-floor-btn" onClick={() => setDnc(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PersonDrawer({
  person,
  snapshot,
  onClose,
  onDnc,
}: {
  person: ReturnType<typeof viewPeople>[number];
  snapshot: Snapshot | null;
  onClose: () => void;
  onDnc: () => void;
}) {
  const { enqueue } = useOsActions();
  const [stage, setStage] = useState(person.stage || "");
  const [step, setStep] = useState(person.next_step || "");
  const [due, setDue] = useState(person.next_step_due || "");
  const [note, setNote] = useState("");
  const [draft, setDraft] = useState("");
  const timeline = personTimeline(person, snapshot);
  return (
    <>
      <button type="button" className="os-drawer-back" aria-label="Close person" onClick={onClose} />
      <aside className="os-drawer" role="dialog" aria-modal="true" aria-label={person.name}>
        <button type="button" className="os-btn" onClick={onClose}>Close</button>
        <p className="os-kicker">{labelTrack(person.track)}</p>
        <div className="os-need">
          <Mark name={person.firm || person.name} domain={person.domain} logoUrl={person.logo_url} />
          <h2 className="os-need-title">{person.name}</h2>
        </div>
        <p className="os-quiet">{[person.firm, person.stage, person.owner].filter(Boolean).join(" · ")}</p>
        {person.badge ? <p className="os-sent">{person.badge}{person.badgeNote ? `. ${person.badgeNote}` : ""}</p> : null}
        {person.email ? <p>{person.email}</p> : null}
        {person.linkedin ? <p><a href={person.linkedin}>{person.linkedin}</a></p> : null}
        <label className="os-note-label">
          Stage
          <input value={stage} onChange={(event) => setStage(event.target.value)} />
        </label>
        <button type="button" onClick={() => enqueue({ type: "crm_stage", target_id: person.id, payload: { stage: stage.trim() }, label: `Stage set for ${person.name}.` })}>
          Save stage
        </button>
        <label className="os-note-label">
          Next step
          <input value={step} onChange={(event) => setStep(event.target.value)} />
        </label>
        <label className="os-note-label">
          Due
          <input type="date" value={due} onChange={(event) => setDue(event.target.value)} />
        </label>
        <div className="os-choice-row">
          <button type="button" onClick={() => enqueue({ type: "crm_next_step", target_id: person.id, payload: { next_step: step.trim(), next_step_due: due || "" }, label: `Next step set for ${person.name}.` })}>
            Save next step
          </button>
          <button type="button" className="os-floor-btn" onClick={() => enqueue({ type: "crm_next_step", target_id: person.id, payload: { next_step: "", next_step_due: "" }, label: `Cleared the next step for ${person.name}.` })}>
            Clear
          </button>
        </div>
        <label className="os-note-label">
          Note
          <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} maxLength={280} />
        </label>
        <button type="button" disabled={!note.trim()} onClick={() => { enqueue({ type: "crm_note", target_id: person.id, payload: { note: note.trim() }, label: `Note added for ${person.name}.`, singleton: false }); setNote(""); }}>
          Add note
        </button>
        {person.notes ? <p className="os-summary">{person.notes}</p> : null}
        <div className="os-choice-row">
          <button type="button" onClick={() => enqueue({ type: "crm_hold", target_id: person.id, payload: { hold: true }, label: `Holding ${person.name}.` })}>Hold contact</button>
          <button type="button" className="os-danger" onClick={onDnc}>Do not contact</button>
        </div>
        <label className="os-note-label">
          Draft a follow-up
          <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={4} placeholder="What should the follow-up say?" />
        </label>
        <button type="button" disabled={!draft.trim()} onClick={() => { enqueue({ type: "draft_followup", target_id: person.id, payload: { text: draft.trim() }, label: `Follow-up queued for ${person.name}.`, singleton: false }); setDraft(""); }}>
          Queue follow-up
        </button>
        <p className="os-fine">Nothing sends from this site.</p>
        <h3>Timeline</h3>
        {timeline.length === 0 ? <p className="os-missing">Nothing in this snapshot mentions them.</p> : (
          <ol className="os-handoffs">
            {timeline.map((item) => (
              <li key={`${item.at}-${item.detail}`}>
                <p className="os-kicker">{item.at.slice(0, 10)}</p>
                <p>{displayParty(item.label)}</p>
                <p className="os-quiet">{item.detail}</p>
              </li>
            ))}
          </ol>
        )}
      </aside>
    </>
  );
}

function Sort({ label, k, sortKey, sortDir, onSort }: { label: string; k: SortKey; sortKey: SortKey; sortDir: "asc" | "desc"; onSort: (key: SortKey) => void }) {
  return (
    <th>
      <button type="button" onClick={() => onSort(k)}>
        {label}
        {sortKey === k ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
      </button>
    </th>
  );
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function labelTrack(track: string): string {
  return TRACKS.find(([value]) => value === track)?.[1] || track;
}

function matchesTouch(value: string | null, filter: string): boolean {
  if (filter === "all") return true;
  if (filter === "none") return !value;
  if (!value) return false;
  const at = Date.parse(value);
  if (!Number.isFinite(at)) return false;
  const days = filter === "7" ? 7 : 30;
  const age = Date.now() - at;
  return age >= -60_000 && age <= days * 24 * 60 * 60 * 1000;
}

function compare(a: CrmPerson, b: CrmPerson, key: SortKey, dir: "asc" | "desc"): number {
  const left = field(a, key);
  const right = field(b, key);
  const result = left.localeCompare(right);
  return dir === "asc" ? result : -result;
}

function field(person: CrmPerson, key: SortKey): string {
  if (key === "name") return person.name;
  if (key === "firm") return person.firm || "";
  if (key === "track") return person.track;
  if (key === "stage") return person.stage || "";
  if (key === "owner") return person.owner || "";
  if (key === "last") return person.last_touch_at || "";
  return person.email || "";
}
