export type OsSection = "today" | "crm" | "pipeline" | "bots" | "activity" | "email";

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
    login: onOs ? "/login" : "/os/login",
    decision: (id: string) => `${root}/d/${encodeURIComponent(id)}`,
    person: (id: string) => `${root}/crm/${encodeURIComponent(id)}`,
  };
}
