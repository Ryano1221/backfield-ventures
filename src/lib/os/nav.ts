export type OsSection = "today" | "crm" | "pipeline" | "bots" | "activity" | "email" | "waiting" | "studio";

type WaitingModel = {
  ready: readonly { requestedBy?: string | null }[];
  hold: readonly { requestedBy?: string | null }[];
  open: readonly { requestedBy?: string | null }[];
  waiting?: readonly { name: string }[];
};

/**
 * The one "waiting on you" count. A bot that already has a decision card is
 * counted once, through its card, so the rail and Today always agree.
 */
export function waitingOnYou(model: WaitingModel): { cards: number; bots: number; total: number } {
  const items = [...model.ready, ...model.hold, ...model.open];
  const asked = new Set(items.map((row) => (row.requestedBy || "").trim().toLowerCase()).filter(Boolean));
  const bots = (model.waiting ?? []).filter((bot) => !asked.has(bot.name.trim().toLowerCase())).length;
  return { cards: items.length, bots, total: items.length + bots };
}

export function osChromeCounts(
  snapshot: { bots?: { bots?: readonly unknown[] } } | null,
  model: WaitingModel & { reviewingCount: number; peopleCount: number },
) {
  if (!snapshot) return { today: null, deals: null, people: null, bots: null };
  return {
    today: waitingOnYou(model).total,
    deals: model.reviewingCount,
    people: model.peopleCount,
    bots: snapshot.bots?.bots?.length ?? null,
  };
}

export function osHrefs(onOs: boolean) {
  const root = onOs ? "" : "/os";
  return {
    today: onOs ? "/" : "/os",
    crm: `${root}/crm`,
    people: `${root}/crm`,
    pipeline: `${root}/pipeline`,
    deals: `${root}/deals`,
    bots: `${root}/bots`,
    activity: `${root}/activity`,
    email: onOs ? "/email" : "/os/email",
    waiting: `${root}/waiting`,
    raise: `${root}/raise`,
    studio: `${root}/studio`,
    spv: `${root}/spv`,
    portfolio: `${root}/portfolio`,
    spvItem: (id: string) => `${root}/spv/${encodeURIComponent(id)}`,
    studioItem: (id: string) => `${root}/studio/${encodeURIComponent(id)}`,
    login: onOs ? "/login" : "/os/login",
    decision: (id: string) => `${root}/d/${encodeURIComponent(id)}`,
    deal: (id: string) => `${root}/deals/${encodeURIComponent(id)}`,
    person: (id: string) => `${root}/crm/${encodeURIComponent(id)}`,
  };
}
