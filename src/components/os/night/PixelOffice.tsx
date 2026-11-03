"use client";

import { useEffect, useRef } from "react";
import type { OfficeData } from "@/lib/os/night";
import { mountOffice } from "./office-engine";

export function PixelOffice({ data }: { data: OfficeData }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node || !data.bots.length) return;
    return mountOffice(node, data);
  }, [data]);
  if (!data.bots.length) return <p className="t-body muted">No bots in this snapshot.</p>;
  return <div ref={ref} />;
}
