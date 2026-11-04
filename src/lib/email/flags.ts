export type Env = Record<string, string | undefined>;

export const SEND_FLAG = "EMAIL_SEND_ENABLED";
export const DB_FLAG = "EMAIL_DB_WRITE_ENABLED";
export const SHEET_FLAG = "EMAIL_SHEET_WRITE_ENABLED";
export const DOUBLE_OPT_IN_FLAG = "DOUBLE_OPT_IN";

export function flagOn(env: Env, name: string): boolean {
  return env[name] === "true";
}

export function emailFlags(env: Env = process.env) {
  return {
    send: flagOn(env, SEND_FLAG),
    db: flagOn(env, DB_FLAG),
    sheet: flagOn(env, SHEET_FLAG),
    doubleOptIn: flagOn(env, DOUBLE_OPT_IN_FLAG),
  };
}
