export type OsSection = "today" | "crm" | "pipeline" | "bots" | "activity";

export function osHrefs(onOs: boolean) {
  const root = onOs ? "" : "/os";
  return {
    today: onOs ? "/" : "/os",
    crm: `${root}/crm`,
    pipeline: `${root}/pipeline`,
    bots: `${root}/bots`,
    activity: `${root}/activity`,
    login: onOs ? "/login" : "/os/login",
  };
}
