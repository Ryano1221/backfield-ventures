"use client";

import { useState } from "react";
import { officeStatus } from "@/lib/os/ask";
import { stageChoices } from "@/lib/os/night";
import type { PersonModel } from "@/lib/os/night";
import { useNightActions } from "./NightFrame";

export function PersonActions({ person }: { person: PersonModel }) {
  const { submit, actions } = useNightActions();
  const [stage, setStage] = useState(person.stage || "unknown");
  const [note, setNote] = useState("");
  const latest = [...actions].reverse().find((action) => action.target_id === person.id && (action.type === "crm_next_step" || action.type === "crm_note" || action.type === "crm_stage"));
  const status = latest ? officeStatus(latest, "the office") : null;

  return (
    <div className="person-actions">
      {person.next ? (
        <button
          type="button"
          className="btn primary"
          onClick={() =>
            submit({
              type: "crm_next_step",
              target_id: person.id,
              payload: { next_step: "", next_step_due: "" },
              label: `Marked the next step done for ${person.name}.`,
            })
          }
        >
          {person.next}
        </button>
      ) : null}
      <label className="note-field">
        <span className="lbl">Stage</span>
        <select
          aria-label={`Stage for ${person.name}`}
          value={stage}
          onChange={(event) => {
            const next = event.target.value;
            setStage(next);
            submit({
              type: "crm_stage",
              target_id: person.id,
              payload: { stage: next },
              label: `Stage set for ${person.name}.`,
            });
          }}
        >
          {stageChoices().map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="note-field">
        <span className="lbl">Note</span>
        <textarea aria-label={`Note for ${person.name}`} value={note} maxLength={2000} onChange={(event) => setNote(event.target.value)} />
        <button
          type="button"
          className="btn"
          disabled={!note.trim()}
          onClick={() => {
            submit({
              type: "crm_note",
              target_id: person.id,
              payload: { note: note.trim() },
              label: `Note added for ${person.name}.`,
            });
            setNote("");
          }}
        >
          Save note
        </button>
      </label>
      {status ? (
        <p className="pickup">
          {status.line}
          {status.note ? ` ${status.note}` : ""}
        </p>
      ) : null}
    </div>
  );
}
