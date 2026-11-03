"use client";

import { useState } from "react";

export function Logo({
  name,
  domain,
  logoUrl,
  large = false,
}: {
  name: string;
  domain?: string | null;
  logoUrl?: string | null;
  large?: boolean;
}) {
  const src = logoUrl
    ? `/api/os/logo?url=${encodeURIComponent(logoUrl)}`
    : domain
      ? `/api/os/logo?domain=${encodeURIComponent(domain)}`
      : "";
  const [failed, setFailed] = useState(!src);
  if (!src || failed) {
    return <span className={`logo fb${large ? " lg" : ""}`}>{monogram(name)}</span>;
  }
  return (
    <span className={`logo${large ? " lg" : ""}`}>
      <img src={src} alt="" onError={() => setFailed(true)} />
    </span>
  );
}

function monogram(name: string): string {
  const parts = name
    .split(/[^A-Za-z0-9]+/)
    .map((part) => part.trim())
    .filter((part) => part && part.toLowerCase() !== "fixture");
  const letters = (parts.length ? parts : [name]).slice(0, 2).map((part) => part.charAt(0).toUpperCase());
  return letters.join("") || "BV";
}
