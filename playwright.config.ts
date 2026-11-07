import { defineConfig, devices } from "@playwright/test";

const PORT = 3488;
const PASSWORD = "e2e-session-only";
const BASE_URL = `http://127.0.0.1:${PORT}`;

// Tests only ever run against a loopback server.
if (!/^http:\/\/(127\.0\.0\.1|localhost|\[::1\]):\d+$/.test(BASE_URL)) throw new Error("e2e baseURL must be loopback");

// The test server starts from an empty environment plus this allowlist, so no
// live key from the shell or CI can reach it.
const PASS_THROUGH = ["PATH", "HOME", "NODE_ENV", "CI", "TMPDIR", "LANG"] as const;
const SERVER_ENV: Record<string, string> = {
  OS_DASHBOARD_PASSWORD: PASSWORD,
  OS_SESSION_SECRET: "e2e-session-secret",
  OS_DASHBOARD_FIXTURES: "1",
  OS_SNAPSHOT_FILE: "/tmp/os-e2e-none.json",
  OS_INGEST_TOKEN: "e2e-ingest-token",
  CRON_SECRET: "e2e-cron-secret",
  NEXT_TELEMETRY_DISABLED: "1",
};
const quote = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`;
const envArgs = [
  ...PASS_THROUGH.filter((key) => process.env[key]).map((key) => `${key}=${quote(process.env[key] as string)}`),
  ...Object.entries(SERVER_ENV).map(([key, value]) => `${key}=${quote(value)}`),
].join(" ");

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: BASE_URL,
    channel: "chrome",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "phone", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, colorScheme: "light" } },
    {
      name: "tablet",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: false },
    },
    { name: "desk", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, hasTouch: false, isMobile: false } },
  ],
  webServer: {
    command: `env -i ${envArgs} npx next start -H 127.0.0.1 -p ${PORT}`,
    url: `${BASE_URL}/os/login`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
