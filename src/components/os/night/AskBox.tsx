"use client";

import { useEffect, useState } from "react";
import { askActions, officeStatus, routeAsk, whoLabel } from "@/lib/os/ask";
import type { ActionPayload, ActionType, OsAction } from "@/lib/os/types";

export type AskContext = {
  page: string;
  about: string | null;
  requestedBy: string | null;
  botName: string | null;
};

type Filed = {
  type: ActionType;
  target_id: string;
  payload: ActionPayload;
  label: string;
  retry?: boolean;
};

export function AskBox({
  actions,
  context,
  onSubmit,
  bots = [],
  variant = "bar",
}: {
  actions: OsAction[];
  context: AskContext;
  onSubmit?: (draft: Filed) => void;
  bots?: string[];
  variant?: "bar" | "sheet";
}) {
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [whoOpen, setWhoOpen] = useState(false);
  const bot = picked ?? context.botName ?? "";
  const [local, setLocal] = useState<OsAction[]>([]);
  const [error, setError] = useState("");
  const asks = askActions(onSubmit ? actions : [...local, ...actions]).slice(0, 6);

  useEffect(() => {
    if (onSubmit) return;
    let stop = false;
    async function pull() {
      if (document.visibilityState !== "visible") return;
      const res = await fetch("/api/os/actions/mine");
      if (!res.ok) return;
      const body = (await res.json()) as { actions?: OsAction[] };
      if (!stop && Array.isArray(body.actions)) setLocal(body.actions.filter((action) => action.type === "free_text" || action.type === "bot_request"));
    }
    const timer = window.setInterval(pull, 30000);
    document.addEventListener("visibilitychange", pull);
    return () => {
      stop = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", pull);
    };
  }, [onSubmit]);

  async function file(event: React.FormEvent) {
    event.preventDefault();
    const routed = routeAsk({
      text,
      page: context.page,
      about: context.about,
      botName: bot || context.botName,
      requestedBy: context.requestedBy,
    });
    if (typeof routed.payload.text !== "string" || !routed.payload.text) return;
    setError("");
    if (onSubmit) {
      onSubmit({ type: routed.type, target_id: routed.target_id, payload: routed.payload, label: `Asked ${whoLabel(routed.target_id)}.` });
      setText("");
      return;
    }
    const res = await fetch("/api/os/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: routed.type,
        target_id: routed.target_id,
        payload: routed.payload,
        idempotency_key: `ask:${crypto.randomUUID()}`,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { action?: OsAction; error?: string };
    if (!res.ok || !body.action) {
      setError(body.error || "Could not file that.");
      return;
    }
    setLocal((current) => [body.action!, ...current]);
    setText("");
  }

  const names = bots.filter((name, index) => bots.indexOf(name) === index);
  const who = bot || "The office";

  return (
    <div className={variant === "sheet" ? "ask is-sheet" : "ask"}>
      {variant === "sheet" ? <div className="ask-thread">
        <p className="ask-note">This files a request. Nothing sends until you approve the exact text.</p>
        {asks.length ? (
          <ul className="ask-list">
            {asks.map((ask) => {
              const status = officeStatus(ask, whoLabel(ask.target_id));
              return (
                <li key={ask.action_id}>
                  <span>{typeof ask.payload.text === "string" ? ask.payload.text : "Ask"}</span>
                  {status ? <span>{status.line}{status.note ? ` ${status.note}` : ""}</span> : null}
                  {status?.retry && onSubmit ? (
                    <button
                      type="button"
                      className="btn"
                      onClick={() =>
                        onSubmit({
                          type: ask.type,
                          target_id: ask.target_id,
                          payload: ask.payload,
                          label: "Retry the ask.",
                          retry: true,
                        })
                      }
                    >
                      Retry
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="ask-empty">No asks yet.</p>
        )}
        {error ? <p className="os-error">{error}</p> : null}
      </div> : error ? <p className="os-error">{error}</p> : null}
      <form className="ask-compose" onSubmit={file}>
        <button type="button" className="who-chip" aria-expanded={whoOpen} onClick={() => setWhoOpen(true)}>
          {who}
        </button>
        <input
          className="pill"
          aria-label="Ask the firm"
          placeholder={bot ? `Ask ${bot}` : "Ask the firm"}
          value={text}
          maxLength={2000}
          onChange={(event) => setText(event.target.value)}
        />
        <button type="submit" className="btn primary" disabled={!text.trim()}>
          Ask
        </button>
      </form>
      {whoOpen ? (
        <div className="who-sheet" role="dialog" aria-label="Which bot">
          <button type="button" className="sheet-scrim" aria-label="Close" onClick={() => setWhoOpen(false)} />
          <div className="who-card">
            <div className="sheet-handle" aria-hidden />
            <button type="button" aria-pressed={!bot} onClick={() => { setPicked(""); setWhoOpen(false); }}>
              The office
            </button>
            {names.map((name) => (
              <button key={name} type="button" aria-pressed={bot === name} onClick={() => { setPicked(name); setWhoOpen(false); }}>
                {name}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
