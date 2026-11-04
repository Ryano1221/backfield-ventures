"use client";

import { useEffect, useRef } from "react";
import type { OfficeData } from "@/lib/os/night";
import { mountOffice } from "./office-engine";

export type OfficeNeed = { slug: string; name: string; href: string | null };

export function PixelOffice({
  data,
  now,
  active,
  needs,
  onOpenBot,
}: {
  data: OfficeData;
  now: number;
  active: boolean;
  needs: OfficeNeed[];
  onOpenBot: (slug: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const api = useRef<{ poke: () => void } | null>(null);
  const live = useRef({ active, onOpenBot, needs, now });
  useEffect(() => {
    live.current = { active, onOpenBot, needs, now };
  });
  useEffect(() => {
    const node = ref.current;
    if (!node || !data.bots.length) return;
    const handle = mountOffice(node, data, {
      now: live.current.now,
      needs: live.current.needs,
      active: () => live.current.active,
      onOpenBot: (slug) => live.current.onOpenBot(slug),
    });
    api.current = handle;
    return () => handle.destroy();
  }, [data]);
  useEffect(() => {
    api.current?.poke();
  }, [active]);
  if (!data.bots.length) return <p className="t-body muted">No bots in this snapshot.</p>;
  return <div ref={ref} />;
}
