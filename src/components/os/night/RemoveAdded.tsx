"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Take a hand-logged company back off the list. */
export function RemoveAdded({ name, backHref }: { name: string; backHref: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function remove() {
    if (!window.confirm(`Take ${name} off your list?`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/os/companies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: "remove", name }) });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Could not remove it.");
        setBusy(false);
        return;
      }
      router.push(backHref);
      router.refresh();
    } catch {
      setError("No connection. Nothing changed.");
      setBusy(false);
    }
  }
  return (
    <div className="sx-actions">
      <button type="button" className="btn" disabled={busy} onClick={remove}>
        {busy ? "Removing…" : "Remove from my list"}
      </button>
      {error ? <p className="sx-error" role="alert">{error}</p> : null}
    </div>
  );
}
