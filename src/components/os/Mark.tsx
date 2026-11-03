"use client";

import { useState } from "react";

export function Mark({ name, domain, logoUrl }: { name: string; domain?: string | null; logoUrl?: string | null }) {
  const src = logoUrl
    ? `/api/os/logo?url=${encodeURIComponent(logoUrl)}`
    : domain
      ? `/api/os/logo?domain=${encodeURIComponent(domain)}`
      : "";
  const [failed, setFailed] = useState(!src);
  if (!src || failed) {
    return (
      <span className="os-monogram" aria-hidden>
        {monogram(name)}
      </span>
    );
  }
  return <img className="os-logo" src={src} alt="" width={28} height={28} onError={() => setFailed(true)} />;
}

function monogram(name: string): string {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part && part.toLowerCase() !== "fixture");
  const letters = (parts.length ? parts : name.split(/\s+/)).slice(0, 2).map((part) => part.charAt(0).toUpperCase());
  return letters.join("") || "BV";
}
