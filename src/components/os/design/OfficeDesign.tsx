"use client";

import { useState } from "react";
import { DesignFrame } from "./DesignFrame";

const FLOORS = [
  {
    id: "exec",
    name: "Exec",
    line: "Ryan's office and BV Executive.",
    people: [
      { name: "BV Executive", doing: "Waiting on your yes before a LinkedIn reply goes out." },
    ],
  },
  {
    id: "investment",
    name: "Investment",
    line: "The desk that prepares partner packs and company scores.",
    people: [
      { name: "Investment", doing: "The October partner pack is on hold until you approve it." },
    ],
  },
  {
    id: "intelligence",
    name: "Intelligence",
    line: "Research for the companies in front of you.",
    people: [{ name: "Intelligence", doing: "No new handoff is waiting on this floor." }],
  },
  {
    id: "network",
    name: "Network",
    line: "People and introductions.",
    people: [{ name: "Network", doing: "No new handoff is waiting on this floor." }],
  },
  {
    id: "growth",
    name: "Growth",
    line: "Outreach and the public story.",
    people: [{ name: "Growth", doing: "No new handoff is waiting on this floor." }],
  },
  {
    id: "firm",
    name: "Firm OS",
    line: "The systems the other floors use.",
    people: [{ name: "Firm OS", doing: "No new handoff is waiting on this floor." }],
  },
];

export function OfficeDesign({
  todayHref,
  crmHref,
  botsHref,
}: {
  todayHref: string;
  crmHref: string;
  botsHref: string;
}) {
  const [floorId, setFloorId] = useState("exec");
  const [who, setWho] = useState<string | null>("BV Executive");
  const floor = FLOORS.find((item) => item.id === floorId) ?? FLOORS[0];
  const person = floor.people.find((item) => item.name === who) ?? null;

  return (
    <DesignFrame todayHref={todayHref} crmHref={crmHref} botsHref={botsHref} active="bots">
      <p className="dx-banner">Design mock of one room at a time. This is not the live office, and nothing here pauses a bot.</p>
      <p className="dx-counts">
        <span>
          <strong>{floor.name}</strong>
          {` floor. ${floor.line}`}
        </span>
      </p>
      <div className="dx-floors" role="tablist" aria-label="Floors">
        {FLOORS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={item.id === floor.id}
            className={item.id === floor.id ? "is-on" : undefined}
            onClick={() => {
              setFloorId(item.id);
              setWho(item.people[0]?.name ?? null);
            }}
          >
            {item.name}
          </button>
        ))}
      </div>
      <div className="dx-room" aria-label={`${floor.name} floor`}>
        {floor.people.map((item) => (
          <button key={item.name} type="button" className={item.name === who ? "dx-robot is-on" : "dx-robot"} onClick={() => setWho(item.name)}>
            <span className="dx-avatar" aria-hidden />
            <span>{item.name}</span>
          </button>
        ))}
      </div>
      <p className="dx-dialogue" role="status">
        {person ? (
          <>
            <strong>{person.name}. </strong>
            {person.doing}
          </>
        ) : (
          "Click a name to see what they are doing."
        )}
      </p>
    </DesignFrame>
  );
}
