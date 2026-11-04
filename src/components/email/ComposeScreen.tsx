"use client";

import { useMemo, useState } from "react";
import { reviewSend } from "@/lib/email/copy";
import { textToHtml } from "@/lib/email/format";
import { DRAFTS, type EmailDraft } from "@/lib/email/templates";

function messageBody(text: string): string {
  if (!text.startsWith("From:")) return text;
  const splitAt = text.indexOf("\n\n");
  return splitAt < 0 ? text : text.slice(splitAt + 2);
}
import { PageHead, SampleTag } from "./ui";

export function ComposeScreen({ initialId }: { initialId: string }) {
  const initial = DRAFTS.find((draft) => draft.id === initialId) ?? DRAFTS[0];
  const [draftId, setDraftId] = useState(initial.id);
  const draft = DRAFTS.find((item) => item.id === draftId) ?? DRAFTS[0];
  const [text, setText] = useState(messageBody(draft.text));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  function select(next: EmailDraft) {
    setDraftId(next.id);
    setText(messageBody(next.text));
    setNote("");
  }

  const html = useMemo(() => textToHtml(text), [text]);
  const checks = reviewSend({ subject: draft.subject, text, html, requireIssue: draft.requireIssue });

  async function sendTest() {
    setBusy(true);
    setNote("");
    try {
      const res = await fetch("/api/os/email/compose/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId: draft.id, text }),
      });
      const body = (await res.json()) as { dryRun?: boolean };
      setNote(res.ok && body.dryRun ? "Dry run. Nothing was sent." : "That test did not run.");
    } catch {
      setNote("That test did not run.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHead
        title={draft.name}
        lede={
          <>
            {draft.detail}. <SampleTag />
          </>
        }
        primary={
          <button type="button" className="primary-btn" onClick={sendTest} disabled={busy}>
            {busy ? "Checking" : "Send test to me"}
          </button>
        }
      />
      <div className="split">
        <section className="card">
          <div className="h">
            <span className="lbl">Drafts</span>
          </div>
          {DRAFTS.filter((item) => item.group === "Drafts").map((item) => (
            <button type="button" key={item.id} className={item.id === draft.id ? "draft on" : "draft"} onClick={() => select(item)}>
              <div className="draft-meta">
                <span className="n">{item.name}</span>
                <span className="state">{item.state}</span>
              </div>
              <div className="o">{item.detail}</div>
            </button>
          ))}
          <div className="h">
            <span className="lbl">Automatic</span>
          </div>
          {DRAFTS.filter((item) => item.group === "Automatic").map((item) => (
            <button type="button" key={item.id} className={item.id === draft.id ? "draft on" : "draft"} onClick={() => select(item)}>
              <div className="draft-meta">
                <span className="n">{item.name}</span>
                <span className="state">{item.state}</span>
              </div>
              <div className="o">{item.detail}</div>
            </button>
          ))}
          <div className="h">
            <span className="lbl">Sent</span>
            <span className="lbl">0</span>
          </div>
          <p className="block">Nothing sent yet.</p>
        </section>
        <section className="card">
          <div className="h">
            <span className="lbl">
              {draft.name} · {draft.state} <SampleTag />
            </span>
          </div>
          <div className="msg">
            <div className="hd">
              <span className="lbl">From</span>
              <span>{draft.from}</span>
              <span className="lbl">Reply to</span>
              <span>{draft.replyTo}</span>
              <span className="lbl">Subject</span>
              <span>{draft.subject}</span>
            </div>
            <textarea className="editor" aria-label="Email text" value={text} onChange={(event) => setText(event.target.value)} />
          </div>
          {!draft.enabled ? <p className="block hint">Ryan sees this before it is turned on.</p> : null}
          {note ? <p className="block result">{note}</p> : null}
        </section>
        <aside className="card checks-col">
          <div className="h">
            <span className="lbl">Before it sends</span>
          </div>
          <ul className="checks">
            {checks.map((check) => (
              <li key={check.id} className={check.pass ? "pass" : ""}>
                <i aria-hidden="true" />
                {check.label}
              </li>
            ))}
          </ul>
          <div className="actions">
            <button type="button" className="text-btn" disabled aria-describedby="send-off">
              Send to list
            </button>
            <p className="hint" id="send-off">
              Sending is off for this preview.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
