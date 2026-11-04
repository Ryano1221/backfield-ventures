"use client";

import { useState, type FormEvent } from "react";

export function SignupTry({
  list,
  showOptIn = false,
  buttonLabel,
}: {
  list: string;
  showOptIn?: boolean;
  buttonLabel: string;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [optIn, setOptIn] = useState(false);
  const [note, setNote] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setNote("");
    try {
      const res = await fetch("/api/email/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          list,
          optInHandoff: showOptIn ? optIn : false,
        }),
      });
      const body = (await res.json()) as { ok?: boolean; dryRun?: boolean; joined?: string[] };
      if (!res.ok || !body.ok) {
        setNote("That signup was not accepted.");
        return;
      }
      const joined = (body.joined ?? []).join(", ");
      setNote(body.dryRun ? `Dry run. Lists: ${joined || "none"}. Nothing was stored.` : `Lists: ${joined}.`);
    } catch {
      setNote("That signup did not run.");
    }
  }

  return (
    <form className="block" onSubmit={onSubmit}>
      <div className="field">
        <label htmlFor={`${list}-name`}>First name</label>
        <input id={`${list}-name`} value={name} onChange={(event) => setName(event.target.value)} type="text" autoComplete="given-name" />
      </div>
      <div className="field">
        <label htmlFor={`${list}-email`}>Email</label>
        <input id={`${list}-email`} value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" />
      </div>
      {showOptIn ? (
        <label className="opt">
          <input type="checkbox" checked={optIn} onChange={(event) => setOptIn(event.target.checked)} />
          <span>Also send me The Handoff, my monthly note. Optional, and left unchecked by default.</span>
        </label>
      ) : null}
      <div className="actions">
        <button type="submit" className="text-btn">
          {buttonLabel}
        </button>
      </div>
      {note ? <p className="result">{note}</p> : null}
    </form>
  );
}
