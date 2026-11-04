export type Subscriber = {
  name: string;
  email: string;
  source: string;
  tags: string[];
  joined: string;
};

export type SendRow = {
  name: string;
  list: string;
  state: string;
  sentTo: string;
};

export const SAMPLE_SUBSCRIBERS: Subscriber[] = [
  {
    name: "Sample Reader One",
    email: "reader.one@example.com",
    source: "Handoff page",
    tags: ["Handoff"],
    joined: "2026-11-02",
  },
  {
    name: "Sample Reader Two",
    email: "reader.two@example.com",
    source: "List page",
    tags: ["Handoff", "List: Sample List"],
    joined: "2026-11-01",
  },
  {
    name: "Sample Partner One",
    email: "partner.one@example.com",
    source: "Added by hand",
    tags: ["Best 3"],
    joined: "2026-10-30",
  },
  {
    name: "Sample Reader Three",
    email: "reader.three@example.com",
    source: "Instagram",
    tags: ["List: Sample List"],
    joined: "2026-10-29",
  },
  {
    name: "Sample Reader Four",
    email: "reader.four@example.com",
    source: "Import",
    tags: ["Handoff"],
    joined: "2026-10-28",
  },
  {
    name: "Sample Reader Five",
    email: "reader.five@example.com",
    source: "Handoff page",
    tags: ["Handoff"],
    joined: "2026-10-27",
  },
];

export const SAMPLE_SENDS: SendRow[] = [
  { name: "The Handoff, Issue 01", list: "Handoff", state: "Draft", sentTo: "Not sent yet" },
  { name: "Welcome email", list: "Handoff", state: "Draft", sentTo: "Not sent yet" },
  { name: "Sample List delivery", list: "Lead magnet", state: "Automatic", sentTo: "9" },
  { name: "Test send to me", list: "Handoff", state: "Test", sentTo: "1" },
];

export const SAMPLE_WEEKS = [20, 30, 25, 40, 35, 50, 45, 55, 50, 65, 60, 80];

export const SAMPLE_STATS = {
  subscribers: 120,
  newThisMonth: 14,
  unsubscribed: 1,
  listSignups: 9,
};

export const REAL_STRIP = {
  label: "Real today, from beehiiv (read Nov 4)",
  subscribers: 7,
  draft: "1 draft, Issue 01",
  sends: 0,
  welcome: "No welcome email",
};
