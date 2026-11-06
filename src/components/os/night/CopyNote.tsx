"use client";

import { useState } from "react";

/** A ready-to-paste note with a Copy button. Nothing sends from the OS. */
export function CopyNote({ title, text, hint }: { title: string; text: string; hint: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }
  return (
    <details className="sx-card spv-update">
      <summary>{title}</summary>
      <p className="sx-hint">{hint}</p>
      <textarea className="sx-text" readOnly rows={Math.min(14, text.split("\n").length + 1)} value={text} aria-label={title} />
      <div className="sx-actions">
        <button type="button" className="btn" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </details>
  );
}
