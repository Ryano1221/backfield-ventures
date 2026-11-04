export type OsSection = "today" | "crm" | "pipeline" | "bots" | "activity";

export function osChromeCounts(
  snapshot: { bots?: { bots?: readonly unknown[] } } | null,
  model: { ready: readonly unknown[]; hold: readonly unknown[]; open: readonly unknown[]; reviewingCount: number; peopleCount: number },
) {
  if (!snapshot) return { today: null, deals: null, people: null, bots: null };
  return {
    today: model.ready.length + model.hold.length + model.open.length,
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
    login: onOs ? "/login" : "/os/login",
    decision: (id: string) => `${root}/d/${encodeURIComponent(id)}`,
    person: (id: string) => `${root}/crm/${encodeURIComponent(id)}`,
  };
}
