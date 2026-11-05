"use client";

import { useState } from "react";

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

  return (
    <button
      type="button"
      className={primary ? "primary-btn" : "text-btn"}
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
