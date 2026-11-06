"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ADDED_SOURCES, companyKey, type AddedSource } from "@/lib/os/added-companies";

/** Log a pitch the office never saw, like a LinkedIn DM. Saves to the OS only; nothing sends. */
export function AddCompany({ dealHref }: { dealHref: (id: string) => string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [founder, setFounder] = useState("");
  const [source, setSource] = useState<AddedSource>("LinkedIn");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/os/companies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: "add", name, website, founder, source, note }) });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessage({ tone: "error", text: data.error || "Could not save that." });
        return;
      }
      // Open the new company's page: it renders fresh, and it's where the memo and SPV live.
      router.push(dealHref(`co_${companyKey(name)}`));
    } catch {
      setMessage({ tone: "error", text: "No connection. Nothing was saved." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="add-co">
      <button type="button" className={open ? "btn" : "btn primary"} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {open ? "Cancel" : "Add a company"}
      </button>
      {open ? (
        <form className="sx-card sx-new" onSubmit={save} aria-label="Add a company">
          <p className="sx-hint">For pitches that came in on LinkedIn, by text or in person. Saved in the OS only.</p>
          <div className="add-co-grid">
            <label className="sx-field">
              <span className="lbl">Company</span>
              <input value={name} onChange={(event) => setName(event.target.value)} maxLength={160} required autoComplete="off" />
            </label>
            <label className="sx-field">
              <span className="lbl">Website (optional)</span>
              <input value={website} onChange={(event) => setWebsite(event.target.value)} maxLength={300} placeholder="company.com" inputMode="url" autoComplete="off" />
            </label>
            <label className="sx-field">
              <span className="lbl">Founder (optional)</span>
              <input value={founder} onChange={(event) => setFounder(event.target.value)} maxLength={120} autoComplete="off" />
            </label>
          </div>
          <div className="segment sx-wrap" role="group" aria-label="Where it came from">
            {ADDED_SOURCES.map((value) => (
              <button key={value} type="button" aria-pressed={source === value} onClick={() => setSource(value)}>
                {value}
              </button>
            ))}
          </div>
          <label className="sx-field">
            <span className="lbl">Note (optional)</span>
            <textarea className="sx-text" rows={3} value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} placeholder="What they do, what they asked for" />
          </label>
          {message ? (
            <p className={message.tone === "error" ? "sx-error" : "sx-ok"} role={message.tone === "error" ? "alert" : "status"}>
              {message.text}
            </p>
          ) : null}
          <div className="sx-actions">
            <button type="submit" className="btn primary" disabled={busy || !name.trim()}>
              {busy ? "Saving…" : "Add company"}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
