import { defineConfig, devices } from "@playwright/test";

const PORT = 3488;
const PASSWORD = "e2e-session-only";

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    channel: "chrome",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "phone", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, colorScheme: "dark" } },
    { name: "phone-dark", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, colorScheme: "dark" } },
    { name: "phone-light", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, colorScheme: "light" } },
    { name: "tablet", use: { ...devices["Desktop Chrome"], viewport: { width: 1024, height: 768 }, hasTouch: false, isMobile: false } },
    { name: "desk", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, hasTouch: false, isMobile: false } },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}/os/login`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      OS_DASHBOARD_PASSWORD: PASSWORD,
      OS_SESSION_SECRET: "e2e-session-secret",
      OS_DASHBOARD_FIXTURES: "1",
      OS_SNAPSHOT_FILE: "/tmp/os-e2e-none.json",
    },
  },
});
