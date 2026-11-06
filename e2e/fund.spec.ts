import { expect, test, type Page } from "@playwright/test";
import { unlinkSync } from "node:fs";

const PASSWORD = "e2e-session-only";

test.beforeEach(() => {
  for (const file of ["/tmp/os-lp-pipeline.json", "/tmp/os-raise.json", "/tmp/os-deal-memos.json", "/tmp/os-spvs.json", "/tmp/os-holdings.json", "/tmp/os-added-companies.json"]) {
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

  // A pasteable update for investors, with no names in it.
  await page.getByText("Update for investors", { exact: true }).click();
  const update = page.getByRole("textbox", { name: "Update for investors" });
  await expect(update).toHaveValue(/Committed so far: \$125K of \$500K\./);
  await expect(update).not.toHaveValue(/Rhea/);

  // Closing puts the company in the portfolio on Investments.
  await page.getByRole("group", { name: "SPV status" }).getByRole("button", { name: "Closing", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Marked closing.");
  await page.goto("/os/deals");
  const portfolio = page.getByRole("region", { name: "Portfolio" });
  await expect(portfolio).toContainText("Northwind");
  await expect(portfolio).toContainText("SPV closing");
  await page.goBack();

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

test("a new SPV can be pulled from a deal by typing the company", async ({ page }) => {
  await signIn(page);
  await page.goto("/os/spv");
  const newButton = page.getByRole("button", { name: "New SPV" });
  if (await newButton.isVisible()) await newButton.click();
  const company = page.getByRole("combobox", { name: "Company" });
  await company.fill("cedar");
  const option = page.getByRole("option", { name: /FIXTURE Cedar/ });
  await expect(option).toBeVisible();
  await option.click();
  await expect(company).toHaveValue(/FIXTURE Cedar/);
  await expect(page.getByText(/^Linked to the FIXTURE Cedar/)).toBeVisible();
  await page.getByRole("button", { name: "Create SPV" }).click();
  await expect(page).toHaveURL(/\/os\/spv\/spv_/);
  await expect(page.getByRole("link", { name: "Open the deal" })).toBeVisible();
});

test("companies that never pitched still show on Investments and open their own page", async ({ page }) => {
  await signIn(page);
  await page.goto("/os/deals");
  await page.getByRole("textbox", { name: "Search companies" }).fill("growl");
  const card = page.locator(".deal-card", { hasText: "GROWL" });
  await expect(card).toBeVisible();
  await expect(card).toContainText("The Handoff");
  await card.getByRole("link").first().click();
  await expect(page).toHaveURL(/\/os\/deals\/co_growl/);
  await expect(page.getByRole("heading", { name: "GROWL" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start an SPV for this deal" })).toBeVisible();
});

test("a LinkedIn pitch can be logged by hand, opened, and taken back off", async ({ page }, testInfo) => {
  const name = `FIXTURE LinkedIn Co ${testInfo.project.name} ${Date.now()}`;
  await signIn(page);
  await page.goto("/os/deals");
  await page.getByRole("button", { name: "Add a company" }).click();
  const form = page.getByRole("form", { name: "Add a company" });
  await form.getByLabel("Company", { exact: true }).fill(name);
  await form.getByLabel("Website (optional)").fill("linkedin-co.example");
  await expect(form.getByRole("group", { name: "Where it came from" }).getByRole("button", { name: "LinkedIn" })).toHaveAttribute("aria-pressed", "true");
  await form.getByRole("button", { name: "Add company" }).click();
  await expect(page).toHaveURL(/\/os\/deals\/co_/);
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await expect(page.getByText("LinkedIn, added by you").first()).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Remove from my list" }).click();
  await expect(page).toHaveURL(/\/os\/deals$/);
  await expect(page.locator(".deal-card", { hasText: name })).toHaveCount(0);
});

test("the companies API needs a session", async ({ request }) => {
  const res = await request.post("/api/os/companies", { data: { op: "add", name: "x" } });
  expect(res.status()).toBe(401);
});

test("a holding goes on the books, gets marked at a new round, and shows its multiple", async ({ page }, testInfo) => {
  const name = `FIXTURE Holding ${testInfo.project.name} ${Date.now()}`;
  await signIn(page);
  await page.goto("/os/portfolio");
  const form = page.getByRole("form", { name: "Add a holding" });
  await expect(async () => {
    const add = page.getByRole("button", { name: "Add a holding" });
    if (!(await form.isVisible()) && (await add.isVisible())) await add.click();
    await expect(form).toBeVisible({ timeout: 3000 });
  }).toPass({ timeout: 20000 });
  await form.getByRole("combobox", { name: "Company" }).fill(name);
  await form.getByLabel("Check size").fill("$100K");
  await form.getByLabel("Date invested").fill("2025-01-15");
  await form.getByLabel("Valuation or cap (optional)").fill("$10M");
  await form.getByRole("button", { name: "Add holding" }).click();
  await expect(page.getByRole("status")).toContainText(`${name} is on the books`);

  const card = page.locator(".port-card", { hasText: name });
  await expect(card).toContainText("1.00x");
  await expect(card).toContainText("1.0%");
  await card.getByText(`Update ${name}`).click();
  const mark = card.getByRole("form", { name: `Mark ${name}` });
  await mark.getByLabel("Post-money").fill("$40M");
  await mark.getByRole("button", { name: "Save mark" }).click();
  await expect(card).toContainText("4.00x");
  await expect(page.getByRole("region", { name: "Fund metrics" })).toContainText("TVPI");

  page.once("dialog", (dialog) => dialog.accept());
  await card.getByRole("button", { name: "Remove holding" }).click();
  await expect(page.locator(".port-card", { hasText: name })).toHaveCount(0);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow).toBe(false);
});

test("the holdings API needs a session", async ({ request }) => {
  const res = await request.post("/api/os/holdings", { data: { op: "create", company: "x", invested_usd: 1 } });
  expect(res.status()).toBe(401);
});

test("past SPV investors are one tap away on the next SPV", async ({ page }) => {
  await signIn(page);
  // A closed SPV with one committed investor.
  await page.evaluate(async () => {
    const post = (body: unknown) => fetch("/api/os/spvs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((res) => res.json() as Promise<{ id: string }>);
    const { id } = await post({ op: "create", company: "FIXTURE Past Co" });
    await post({ op: "allocate", id, name: "FIXTURE Example Investor", amount_usd: 100000, status: "committed" });
  });
  await page.goto("/os/spv");
  await expect(page.getByRole("region", { name: "Your SPV investors" })).toContainText("FIXTURE Example Investor");
  const add = page.getByRole("button", { name: "New SPV" });
  await expect(async () => {
    if (await add.isVisible()) await add.click();
    await expect(page.getByRole("combobox", { name: "Company" })).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 15000 });
  await page.getByRole("combobox", { name: "Company" }).fill(`FIXTURE Repeat Co ${Date.now()}`);
  await page.getByRole("button", { name: "Create SPV" }).click();
  await expect(page).toHaveURL(/\/os\/spv\/spv_/);
  const allocs = page.getByRole("region", { name: "Allocations" });
  await allocs.getByRole("button", { name: /^FIXTURE Example Investor/ }).click();
  await expect(allocs.getByLabel("Investor", { exact: true })).toHaveValue("FIXTURE Example Investor");
  await expect(allocs.getByLabel("Amount", { exact: true })).toHaveValue("$100K");
});

test("an SPV investor's page shows what their stake is worth and a statement to send", async ({ page }) => {
  await signIn(page);
  await page.evaluate(async () => {
    const post = (url: string, body: unknown) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((res) => res.json() as Promise<{ id: string }>);
    const { id } = await post("/api/os/spvs", { op: "create", company: "FIXTURE Marked Co" });
    await post("/api/os/spvs", { op: "allocate", id, name: "FIXTURE Rhea Reply", person_id: "fix-rhea", amount_usd: 50000, status: "wired" });
    const holding = await post("/api/os/holdings", { op: "create", company: "FIXTURE Marked Co", invested_usd: 500000, valuation_usd: "$10M", date: "2025-01-15", vehicle: "spv", spv_id: id });
    await post("/api/os/holdings", { op: "mark", id: holding.id, value_usd: 1500000, date: "2026-06-01" });
  });
  await page.goto("/os/crm/fix-rhea");
  const card = page.getByRole("region", { name: "With Backfield" });
  await expect(card).toContainText("now $150K · 3.00x");
  await page.getByText("Statement to send", { exact: true }).click();
  const statement = page.getByRole("textbox", { name: "Statement to send" });
  await expect(statement).toHaveValue(/FIXTURE Marked Co SPV: \$50K in, marked at \$150K \(3\.00x\)\./);
  await expect(statement).toHaveValue(/before carry and fees/);
});
