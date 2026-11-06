import { expect, test, type Page } from "@playwright/test";
import { unlinkSync } from "node:fs";

const PASSWORD = "e2e-session-only";

test.beforeEach(() => {
  for (const file of ["/tmp/os-lp-pipeline.json", "/tmp/os-raise.json", "/tmp/os-deal-memos.json", "/tmp/os-spvs.json"]) {
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
  await memo.getByRole("checkbox", { name: "Team" }).check();
  await memo.getByRole("button", { name: "Save", exact: true }).click();
  await expect(memo.getByRole("status")).toHaveText("Saved.");
  await page.reload();
  await expect(page.getByRole("region", { name: "Investment memo" }).getByRole("group", { name: "Decision" }).getByRole("button", { name: "Pass" })).toHaveAttribute("aria-pressed", "true");
});

test("an SPV starts from a deal, takes terms and allocations, and tracks its checklist", async ({ page }) => {
  await signIn(page);
  await page.goto("/os/deals/pitch_fixture-northwind");
  await page.getByRole("link", { name: "Start an SPV for this deal" }).click();
  await expect(page).toHaveURL(/\/os\/spv\?company=/);
  await expect(page.getByLabel("Company")).toHaveValue(/Northwind/);
  await page.getByRole("button", { name: "Create SPV" }).click();
  await expect(page).toHaveURL(/\/os\/spv\/spv_/);

  const terms = page.getByRole("region", { name: "Terms" });
  await terms.getByLabel("Target").fill("$500K");
  await terms.getByLabel("Minimum check").fill("$10K");
  await terms.getByLabel("Close date").fill("2099-01-15");
  await terms.getByRole("button", { name: "Save terms" }).click();
  await expect(page.getByRole("status")).toHaveText("Terms saved.");

  const allocs = page.getByRole("region", { name: "Allocations" });
  await allocs.getByLabel("Investor", { exact: true }).fill("FIXTURE Example Investor");
  await allocs.getByLabel("Amount", { exact: true }).fill("$100K");
  await allocs.getByRole("group", { name: "New allocation status" }).getByRole("button", { name: "Committed" }).click();
  await allocs.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("region", { name: "Progress" })).toContainText("$100K");

  await allocs.getByLabel("Investor", { exact: true }).fill("FIXTURE Rhea Reply");
  await allocs.getByLabel("Amount", { exact: true }).fill("$25K");
  await allocs.getByRole("button", { name: "Add", exact: true }).click();
  await expect(allocs).toContainText("2 investors");

  await page.getByRole("region", { name: "Checklist" }).getByRole("checkbox", { name: "Entity formed" }).click();
  await expect(page.getByRole("region", { name: "Checklist" })).toContainText("1 of 9");

  // The allocation shows on the investor's own page.
  await page.goto("/os/crm/fix-rhea");
  await expect(page.getByRole("region", { name: "With Backfield" })).toContainText("Northwind");

  await page.goto("/os/deals/pitch_fixture-northwind");
  await expect(page.getByRole("link", { name: /^Open Backfield/ })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow).toBe(false);
});

test("the SPV API needs a session", async ({ request }) => {
  expect((await request.get("/api/os/spvs")).status()).toBe(401);
});
