import { expect, test, type Page } from "@playwright/test";
import { unlinkSync } from "node:fs";

const PASSWORD = "e2e-session-only";

test.beforeEach(() => {
  for (const file of ["/tmp/os-lp-pipeline.json", "/tmp/os-raise.json", "/tmp/os-deal-memos.json"]) {
    try {
      unlinkSync(file);
    } catch {
      /* nothing saved yet */
    }
  }
});

async function signIn(page: Page) {
  await page.goto("/os/login");
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Enter" }).click();
  await expect(page).toHaveURL(/\/os\/?$/);
}

test("an expected check with a confidence moves the weighted pipeline", async ({ page }) => {
  await signIn(page);
  await page.goto("/os/raise");
  const pipe = page.getByRole("region", { name: "LP pipeline" });
  await expect(pipe).toContainText("$0");
  await pipe.getByRole("button", { name: "Edit" }).first().click();
  await pipe.getByLabel("Expected check").fill("$250K");
  await pipe.getByRole("group", { name: /Confidence/ }).getByRole("button", { name: /High/ }).click();
  await pipe.getByRole("button", { name: "Save", exact: true }).click();
  await expect(pipe.locator(".lp-sum")).toContainText("$200K");
  await expect(pipe.locator(".lp-sum")).toContainText("$250K");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow).toBe(false);
});

test("the pipeline API needs a session", async ({ request }) => {
  expect((await request.get("/api/os/lp-pipeline")).status()).toBe(401);
});

test("a pass needs a reason, and the decision is kept", async ({ page }) => {
  await signIn(page);
  await page.goto("/os/deals/pitch_fixture-northwind");
  const memo = page.getByRole("region", { name: "Investment memo" });
  await memo.getByRole("group", { name: "Decision" }).getByRole("button", { name: "Pass" }).click();
  await expect(memo.getByRole("button", { name: "Save", exact: true })).toBeDisabled();
  await memo.getByLabel(/^Why/).fill("FIXTURE reason: too early for this fund.");
  await memo.getByText("Team", { exact: true }).click();
  await memo.getByRole("button", { name: "Save", exact: true }).click();
  await expect(memo.getByRole("status")).toHaveText("Saved.");
  await page.reload();
  await expect(page.getByRole("region", { name: "Investment memo" }).getByRole("group", { name: "Decision" }).getByRole("button", { name: "Pass" })).toHaveAttribute("aria-pressed", "true");
});
