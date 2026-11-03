"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function DecisionKeys({ ids, current, base }: { ids: string[]; current: string; base: string }) {
  const router = useRouter();
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) return;
      const index = ids.indexOf(current);
      if (event.key === "j" && index >= 0 && index < ids.length - 1) {
        router.push(`${base}/${encodeURIComponent(ids[index + 1])}`);
      }
      if (event.key === "k" && index > 0) {
        router.push(`${base}/${encodeURIComponent(ids[index - 1])}`);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ids, current, base, router]);
  return <p className="dx-foot">J next. K previous. This only moves the preview.</p>;
}
