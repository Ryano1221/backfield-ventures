import type { Decision, Pitch } from "./types";

/** Design sample shaped from the live queue Ryan already saw. It does not invent the rest of a cut-off message, an email, or a firm we were not given. */
export const designDecisions: Decision[] = [
  {
    id: "kathleen-linkedin",
    title: "Reply to Kathleen Collins (protein beverage founder)",
    since: "2026-10-28T22:05:00.000Z",
    link: null,
    requested_by: "BV Executive",
    summary: "She wrote you on LinkedIn on Oct 28 about Backfield's food and beverage focus.",
    context: "You are connected on LinkedIn. The block check is clear. She is waiting on your yes before anyone sends.",
    exact_message: "Hi Kathleen, thanks for reaching out.",
    domain: null,
  },
  {
    id: "best3-october-pack",
    title: "Best3 October partner pack",
    since: "2026-10-20T15:00:00.000Z",
    link: null,
    requested_by: "Investment",
    summary: "The October partner pack is on hold until you approve it.",
    context: "The picks from public sources, with no founder material, are Protein Pints, Vaca Chips, and Fave.",
    domain: null,
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
    summary: "In your review queue. Seed company in sports hardware.",
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
    summary: "In your review queue. Seed company in consumer CPG.",
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
    summary: "In your review queue. Seed company in sports.",
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
    summary: "In your review queue. Consumer wellness. No stage was recorded.",
  },
];

export type DesignPerson = {
  id: string;
  name: string;
  role: string;
  firm: string | null;
  domain: string | null;
  why: string;
  next: string;
  channel: string;
  events: { when: string; text: string }[];
};

export const designPeople: DesignPerson[] = [
  {
    id: "kathleen-collins",
    name: "Kathleen Collins",
    role: "Protein beverage founder",
    firm: null,
    domain: null,
    why: "She wrote you on LinkedIn on Oct 28 about food and beverage. A reply is waiting on your yes.",
    next: "Approve the LinkedIn reply, or edit it first.",
    channel: "LinkedIn",
    events: [
      { when: "Oct 28", text: "She asked about Backfield's food and beverage focus." },
      { when: "Now", text: "A reply is drafted. Nothing sends until you approve the exact text." },
    ],
  },
];
