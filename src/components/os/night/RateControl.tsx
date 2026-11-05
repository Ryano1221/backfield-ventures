"use client";

import { useState } from "react";
import { RATING_ORDER, shownPitchRating } from "@/lib/os/pitch-rate";
import type { PitchRating } from "@/lib/os/types";
import { officeStatus } from "@/lib/os/ask";
import { useNightActions } from "./NightFrame";

export function RateControl({
  id,
  company,
  logged,
  generatedAt,
}: {
  id: string;
  company: string;
  logged: PitchRating | null;
  generatedAt: string;
}) {
  const { actions, submit, inflight, errors } = useNightActions();
  const [picked, setPicked] = useState<PitchRating | null>(null);
  const stored = shownPitchRating({ logged, generatedAt, actions, pitchId: id });
  const error = errors[id] || "";
  const pending = Boolean(inflight[id]);
  const shown = error ? stored : pending && picked ? picked : stored;
  const rateRow = [...actions].reverse().find((action) => action.type === "rate" && action.target_id === id) ?? null;
  const rateStatus = rateRow ? officeStatus(rateRow, "the office") : null;

  function choose(rating: PitchRating) {
    setPicked(rating);
    submit({
      type: "rate",
      target_id: id,
      payload: { rating },
      label: `Rated ${company} ${rating}.`,
    });
  }

  return (
    <div className="rate">
      <div className="segment rate-row" role="group" aria-label={`Rating for ${company}`}>
        {RATING_ORDER.map((rating) => (
          <button key={rating} type="button" className="deal-chip" aria-pressed={shown === rating} disabled={pending} onClick={() => choose(rating)}>
            {rating}
          </button>
        ))}
      </div>
      {error ? (
        <p className="os-error" role="alert">
          {error}
        </p>
      ) : null}
      {rateStatus ? (
        <p className="pickup">
          {rateStatus.line}
          {rateStatus.note ? ` ${rateStatus.note}` : ""}
          {rateStatus.retry ? (
            <button
              type="button"
              className="btn"
              onClick={() =>
                shown &&
                submit({
                  type: "rate",
                  target_id: id,
                  payload: { rating: shown },
                  label: `Retry the rating for ${company}.`,
                  retry: true,
                })
              }
            >
              Retry
            </button>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
