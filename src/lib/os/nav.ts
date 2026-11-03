export type OsSection = "today" | "crm" | "pipeline" | "bots" | "activity";

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
