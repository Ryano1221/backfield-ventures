"use client";

import { useEffect, useState } from "react";

export function CopyButton({
  value,
  label,
  primary = false,
}: {
  value: string;
  label: string;
  primary?: boolean;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const shown = state === "copied" ? "Copied" : state === "failed" ? "Could not copy" : label;

  useEffect(() => {
    if (state !== "failed") return;
    const timer = window.setTimeout(() => setState("idle"), 4000);
    return () => window.clearTimeout(timer);
  }, [state]);

  return (
    <button
      type="button"
      className={primary ? "primary-btn" : "text-btn"}
      aria-live="polite"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setState("copied");
        } catch {
          setState("failed");
        }
      }}
    >
      {shown}
    </button>
  );
}
