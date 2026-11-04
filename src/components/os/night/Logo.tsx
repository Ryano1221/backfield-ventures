"use client";

import { useEffect, useRef, useState } from "react";
import { logoReady, monogram } from "@/lib/os/logo-mark";

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
  const ref = useRef<HTMLImageElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    setShown(logoReady(ref.current));
  }, [src]);

  if (!src) {
    return <span className={`logo fb${large ? " lg" : ""}`}>{monogram(name)}</span>;
  }

  return (
    <span className={`logo${shown ? "" : " fb"}${large ? " lg" : ""}`}>
      {shown ? null : monogram(name)}
      <img
        ref={ref}
        src={src}
        alt=""
        className={shown ? undefined : "pending"}
        onLoad={(event) => setShown(logoReady(event.currentTarget))}
        onError={() => setShown(false)}
      />
    </span>
  );
}
