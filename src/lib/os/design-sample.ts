import type { Decision, Pitch } from "./types";

/** Only fields that were already on the live queue. Missing lines are omitted in the UI. */
export const designDecisions: Decision[] = [
  {
    id: "kathleen-linkedin",
    title: "Reply to Kathleen Collins on LinkedIn",
    since: "2026-10-28T22:05:00.000Z",
    link: null,
    exact_message: "Hi Kathleen, thanks for reaching out.",
  },
  {
    id: "best3-october-pack",
    title: "Best3 October partner pack",
    since: "2026-10-20T15:00:00.000Z",
    link: null,
  },
];

export const designDeals: Pitch[] = [
  {
    company: "Easzotic GmbH",
    sector: "Sports hardware",
    stage: "Seed",
    received: "2026-10-15",
    founder: null,
    status: "reviewing",
    score: null,
    source: null,
    deck: null,
  },
  {
    company: "Grit & Grace",
    sector: "Consumer CPG",
    stage: "Seed",
    received: "2026-10-12",
    founder: null,
    status: "reviewing",
    score: null,
    source: null,
    deck: null,
  },
  {
    company: "Ball on Top Ltd.",
    sector: "Sports",
    stage: "Seed",
    received: "2026-10-10",
    founder: null,
    status: "reviewing",
    score: null,
    source: null,
    deck: null,
  },
  {
    company: "Iron & Oak",
    sector: "Consumer wellness",
    stage: null,
    received: "2026-10-08",
    founder: null,
    status: "reviewing",
    score: null,
    source: null,
    deck: null,
  },
];

export type DesignPerson = {
  id: string;
  name: string;
  role: string | null;
  firm: string | null;
  domain: string | null;
  why: string | null;
  next: string | null;
  channel: string | null;
  events: { when: string; text: string }[];
};

export const designPeople: DesignPerson[] = [
  {
    id: "kathleen-collins",
    name: "Kathleen Collins",
    role: null,
    firm: null,
    domain: null,
    why: null,
    next: null,
    channel: null,
    events: [],
  },
];
