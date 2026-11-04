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
}: {
  actions: OsAction[];
  context: AskContext;
  onSubmit?: (draft: Filed) => void;
}) {
  const [text, setText] = useState("");
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
      botName: context.botName,
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

  return (
    <div className="ask">
      <form onSubmit={file}>
        <input
          aria-label="Ask the firm"
          placeholder={context.botName ? `Ask ${context.botName}` : "Ask the firm"}
          value={text}
          maxLength={2000}
          onChange={(event) => setText(event.target.value)}
        />
      </form>
      {error ? <p className="os-error">{error}</p> : null}
      {asks.length ? (
        <ul className="ask-list">
          {asks.map((ask) => {
            const status = officeStatus(ask, whoLabel(ask.target_id));
            return (
              <li key={ask.action_id}>
                <span>{typeof ask.payload.text === "string" ? ask.payload.text : "Ask"}</span>
                {status ? (
                  <span className="lbl">
                    {status.line}
                    {status.note ? ` ${status.note}` : ""}
                  </span>
                ) : null}
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
      ) : null}
    </div>
  );
}
