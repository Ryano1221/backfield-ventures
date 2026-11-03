"use client";

import { useState } from "react";

export function Clamp({ text, limit = 120 }: { text: string; limit?: number }) {
  const [open, setOpen] = useState(false);
  if (text.length <= limit) return <>{text}</>;
  return (
    <>
      {open ? text : `${text.slice(0, limit).trimEnd()}...`}{" "}
      <button type="button" className="os-more" onClick={() => setOpen((value) => !value)}>
        {open ? "Show less" : "Show more"}
      </button>
    </>
  );
}
