"use client";

import { useCallback, useState } from "react";
import { officeStatus } from "@/lib/os/ask";
import { stageButtonLabel, stageChoices } from "@/lib/os/night";
import type { PersonModel } from "@/lib/os/night";
import { useNightActions } from "./NightFrame";
import { useEscape } from "./useEscape";

export function PersonActions({ person }: { person: PersonModel }) {
  const { submit, actions } = useNightActions();
  const [stage, setStage] = useState(person.stage || "unknown");
  const [note, setNote] = useState("");
  const [draft, setDraft] = useState("");
  const [stageOpen, setStageOpen] = useState(false);
  useEscape(stageOpen, useCallback(() => setStageOpen(false), []));
  const latest = [...actions].reverse().find((action) => action.target_id === person.id && (action.type === "crm_next_step" || action.type === "crm_note" || action.type === "crm_stage"));
  const status = latest ? officeStatus(latest, "the office") : null;

  return (
    <div className="person-actions">
      {person.next ? (
        <div className="next-step">
          <p>{person.next}</p>
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
            Mark done
          </button>
        </div>
      ) : null}
      <button type="button" className="who-chip" aria-expanded={stageOpen} onClick={() => setStageOpen(true)}>
        Stage · {stageButtonLabel(stage)}
      </button>
      {stageOpen ? (
        <div className="who-sheet" role="dialog" aria-label={`Stage for ${person.name}`}>
          <button type="button" className="sheet-scrim" aria-label="Close" onClick={() => setStageOpen(false)} />
          <div className="who-card">
            <div className="sheet-handle" aria-hidden />
            {stageChoices().map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={stage.trim().toLowerCase() === option.value}
                onClick={() => {
                  setStage(option.value);
                  setStageOpen(false);
                  submit({
                    type: "crm_stage",
                    target_id: person.id,
                    payload: { stage: option.value },
                    label: `Stage set for ${person.name}.`,
                  });
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <label className="note-field">
        <span className="lbl">Draft follow-up</span>
        <textarea aria-label={`Follow-up for ${person.name}`} value={draft} maxLength={2000} placeholder="The words you want drafted. Nothing sends." onChange={(event) => setDraft(event.target.value)} />
        <button
          type="button"
          className="btn primary"
          disabled={!draft.trim()}
          onClick={() => {
            submit({
              type: "draft_followup",
              target_id: person.id,
              payload: { text: draft.trim() },
              label: `Follow-up queued for ${person.name}.`,
            });
            setDraft("");
          }}
        >
          Queue follow-up
        </button>
      </label>
      <div className="rate-row">
        <button
          type="button"
          className="btn"
          onClick={() =>
            submit({
              type: "crm_hold",
              target_id: person.id,
              payload: { hold: true },
              label: `Holding ${person.name}.`,
            })
          }
        >
          Hold
        </button>
        <button
          type="button"
          className="btn"
          onClick={() =>
            submit({
              type: "crm_dnc",
              target_id: person.id,
              payload: { dnc: true },
              label: `Do not contact ${person.name}.`,
            })
          }
        >
          Do not contact
        </button>
      </div>
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
