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
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className={primary ? "primary-btn" : "text-btn"}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
