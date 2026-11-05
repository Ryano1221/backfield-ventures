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
    if (!src) return;
    let cancel = false;
    let objectUrl = "";
    fetch(src)
      .then(async (res) => {
        if (cancel || !res.ok || res.headers.get("x-logo-miss") === "1") return;
        const blob = await res.blob();
        if (cancel || !blob.type.startsWith("image/")) return;
        objectUrl = URL.createObjectURL(blob);
        if (ref.current) ref.current.src = objectUrl;
      })
      .catch(() => undefined);
    return () => {
      cancel = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (!src) {
    return <span className={`logo fb${large ? " lg" : ""}`}>{monogram(name)}</span>;
  }

  return (
    <span className={`logo${shown ? "" : " fb"}${large ? " lg" : ""}`}>
      {shown ? null : monogram(name)}
      <img
        ref={ref}
        alt=""
        className={shown ? undefined : "pending"}
        onLoad={(event) => setShown(logoReady(event.currentTarget))}
        onError={() => setShown(false)}
      />
    </span>
  );
}
