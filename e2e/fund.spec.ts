import { expect, test, type Page } from "@playwright/test";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";

const PASSWORD = "e2e-session-only";

test.beforeEach(() => {
  for (const file of ["/tmp/os-lp-pipeline.json", "/tmp/os-raise.json", "/tmp/os-deal-memos.json", "/tmp/os-spvs.json", "/tmp/os-holdings.json", "/tmp/os-added-companies.json", "/tmp/os-warm-leads.json", "/tmp/os-leads.json", "/tmp/os-outreach.json", "/tmp/os-outreach-outbox.json", "/tmp/os-findymail.json"]) {
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

test("search can start work: typing 'add a holding' opens the form", async ({ page }) => {
  await signIn(page);
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByLabel("Search people, deals, bots").fill("add a holding");
  await page.getByRole("link", { name: /Add a holding/ }).evaluate((el: HTMLAnchorElement) => el.click());
  await expect(page).toHaveURL(/\/os\/portfolio\?add=1/);
  await expect(page.getByRole("form", { name: "Add a holding" })).toBeVisible();

  await page.goto("/os/deals?add=1");
  await expect(page.getByRole("form", { name: "Add a company" })).toBeVisible();
  await page.goto("/os/spv?new=1");
  await expect(page.getByRole("combobox", { name: "Company" })).toBeVisible();
});

test("the weekly review catches an unwired SPV commitment and links to fix it", async ({ page }) => {
  await signIn(page);
  await page.evaluate(async () => {
    const post = (body: unknown) => fetch("/api/os/spvs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((res) => res.json() as Promise<{ id: string }>);
    const { id } = await post({ op: "create", company: "FIXTURE Owed Co" });
    await post({ op: "allocate", id, name: "FIXTURE Slow Wire", amount_usd: 40000, status: "committed" });
  });
  await page.goto("/os/review");
  const money = page.getByRole("region", { name: "Money" });
  await expect(money).toContainText("$40K committed but not wired on FIXTURE Owed Co.");
  await expect(page.getByRole("region", { name: "Portfolio" })).toContainText("Every closed SPV is a holding.");
  await money.getByRole("link", { name: "Open" }).first().click();
  await expect(page).toHaveURL(/\/os\/spv$/);
});

test("the daily lead search needs the cron secret, then finds leads and they show on Leads", async ({ request, page }) => {
  expect((await request.get("/api/cron/leads")).status()).toBe(401);
  expect((await request.get("/api/cron/leads", { headers: { authorization: "Bearer wrong" } })).status()).toBe(401);
  expect((await request.post("/api/cron/leads", { headers: { authorization: "Bearer e2e-cron-secret" } })).status()).toBe(405);
  const run = await request.get("/api/cron/leads", { headers: { authorization: "Bearer e2e-cron-secret" } });
  expect(run.status()).toBe(200);
  const body = (await run.json()) as { run: { scanned: number; added: number } };
  expect(body.run.added).toBe(1);
  // The test server reads canned filings only; it never reaches the SEC.
  await signIn(page);
  await page.goto("/os/leads");
  await expect(page.getByRole("heading", { name: "Example Fixture Snacks, Inc." })).toBeVisible();
  await expect(page.getByText("Last search")).toBeVisible();
});

test("autopilot: a started sequence sends its first email from the hourly run, and only with the cron secret", async ({ request, page }) => {
  expect((await request.get("/api/cron/outreach")).status()).toBe(401);
  expect((await request.get("/api/cron/leads", { headers: { authorization: "Bearer e2e-cron-secret" } })).status()).toBe(200);
  await signIn(page);
  await page.goto("/os/leads");
  await expect(page.getByRole("heading", { name: "Autopilot off" })).toBeVisible();
  await expect(page.locator(".ap-settings summary")).toContainText("sending from owner@example.com");

  const card = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Example Fixture Snacks, Inc." }) });
  await card.getByRole("textbox", { name: /type one/i }).fill("founder@example.com");
  await card.getByRole("button", { name: "Approve" }).click();
  await page.getByRole("button", { name: /^Approved/ }).click();
  await page.getByRole("button", { name: "Start sequence" }).click();
  await expect(page.getByRole("status").filter({ hasText: /Sequence started for Example Fixture Snacks/ })).toBeVisible();

  // Autopilot off: the run only checks replies.
  let run = await request.get("/api/cron/outreach", { headers: { authorization: "Bearer e2e-cron-secret" } });
  expect(((await run.json()) as { report: { sent: number } }).report.sent).toBe(0);

  await page.getByRole("button", { name: "Turn on" }).click();
  await expect(page.getByRole("heading", { name: "Autopilot on" })).toBeVisible();
  run = await request.get("/api/cron/outreach", { headers: { authorization: "Bearer e2e-cron-secret" } });
  expect(((await run.json()) as { report: { sent: number } }).report.sent).toBe(1);

  await page.reload();
  await page.getByRole("button", { name: /^Sent/ }).click();
  await expect(page.getByText(/^Sequence: Running · email 1 of 5 sent/)).toBeVisible();
});

test("warm leads: an SPV backer becomes a Fund I lead, gets asked for names, and gets credit for the intro", async ({ page }) => {
  await signIn(page);
  await page.evaluate(async () => {
    const post = (body: unknown) => fetch("/api/os/spvs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((res) => res.json() as Promise<{ id: string }>);
    const { id } = await post({ op: "create", company: "FIXTURE Lead Co" });
    await post({ op: "allocate", id, name: "FIXTURE Spv Backer", amount_usd: 50000, status: "wired" });
  });
  await page.goto("/os/raise");
  const spvCard = page.getByRole("region", { name: "SPV investors not in Fund I" });
  await expect(spvCard).toContainText("FIXTURE Spv Backer");
  await spvCard.getByRole("button", { name: "Make a lead" }).click();
  await expect(page.getByRole("status")).toContainText("FIXTURE Spv Backer is a Fund I lead.");
  await expect(page.getByRole("list", { name: "Open leads" })).toContainText("FIXTURE Spv Backer");

  const ask = page.getByRole("region", { name: "Ask for two names" });
  await ask.locator("li", { hasText: "FIXTURE Spv Backer" }).getByRole("button", { name: "I asked" }).click();
  await ask.getByRole("button", { name: "Log a name" }).click();
  const form = page.getByRole("form", { name: "Add a lead" });
  await expect(form.getByLabel("Introduced by (optional)")).toHaveValue("FIXTURE Spv Backer");
  await form.getByLabel("Name", { exact: true }).fill("FIXTURE Named Lead");
  await form.getByRole("button", { name: "Add lead" }).click();
  const leads = page.getByRole("list", { name: "Open leads" });
  await expect(leads).toContainText("via FIXTURE Spv Backer");
  await page.getByRole("group", { name: "Status for FIXTURE Named Lead" }).getByRole("button", { name: "Meeting" }).click();
  await expect(page.getByRole("region", { name: "Best referrers" })).toContainText("FIXTURE Spv Backer");
  await expect(ask).not.toContainText("Waiting on names");
});

test("the leads API needs a session", async ({ request }) => {
  const res = await request.post("/api/os/leads", { data: { op: "add_lead", name: "x" } });
  expect(res.status()).toBe(401);
});

test("leads triage: search, keyboard skip with undo, open and close, and edit a queued sequence email", async ({ request, page }) => {
  expect((await request.get("/api/cron/leads", { headers: { authorization: "Bearer e2e-cron-secret" } })).status()).toBe(200);
  await signIn(page);
  await page.goto("/os/leads");
  const row = page.getByRole("button", { name: /Example Fixture Snacks/ });
  await expect(row).toHaveAttribute("aria-expanded", "true");

  // Search narrows the list, and says so when nothing matches.
  await page.getByLabel("Find a lead").fill("no such company");
  await expect(page.getByText('No founders match "no such company".')).toBeVisible();
  await page.getByLabel("Find a lead").fill("fixture snacks");
  await expect(row).toBeVisible();
  await page.getByLabel("Find a lead").fill("");

  // Keyboard: s skips the focused lead; Undo brings it back.
  await row.focus();
  await page.keyboard.press("s");
  await expect(page.getByRole("status").filter({ hasText: "Skipped Example Fixture Snacks, Inc." })).toBeVisible();
  await expect(row).toHaveCount(0);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(row).toBeVisible();

  // Rows open and close.
  await row.click();
  await expect(row).toHaveAttribute("aria-expanded", "false");
  await row.click();
  await expect(row).toHaveAttribute("aria-expanded", "true");

  // Start a sequence and edit email 2 before it goes out.
  const card = page.getByRole("listitem").filter({ has: row });
  await card.getByRole("textbox", { name: /type one/i }).fill("founder@example.com");
  await card.getByRole("button", { name: "Approve" }).click();
  await page.getByRole("button", { name: /^Approved/ }).click();
  await page.getByRole("button", { name: "Start sequence" }).click();
  await page.getByText(/^The 5 emails$/).click();
  await page.getByRole("button", { name: "Edit email 2" }).click();
  await page.getByRole("textbox", { name: "Email", exact: true }).fill("Hi Fixture,\n\nA shorter follow-up. Still up for a call?\n\nBest,\nRyan");
  await page.getByRole("button", { name: "Save email" }).click();
  await expect(page.getByText("A shorter follow-up. Still up for a call?")).toBeVisible();
});

test("Findymail panel shows credits and lists, and tagging a list pulls its contacts in as leads", async ({ page }) => {
  await signIn(page);
  await page.goto("/os/leads");
  const panel = page.getByRole("region", { name: "Findymail" });
  await expect(panel).toContainText("150 finder and 100 verifier credits left");
  await expect(panel).toContainText("Example family offices");
  await panel.getByRole("group", { name: "Use Example family offices as" }).getByRole("button", { name: "LPs" }).click();
  await expect(panel.getByRole("status")).toContainText("Example family offices: 2 new lps added");
  await page.getByRole("group", { name: "Lead type" }).getByRole("button", { name: /LPs/ }).click();
  await expect(page.getByRole("button", { name: /Example Family Office/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Example Holdings Office/ })).toBeVisible();
});

test("send now: two taps send the first email from Gmail and start the sequence", async ({ request, page }) => {
  expect((await request.get("/api/cron/leads", { headers: { authorization: "Bearer e2e-cron-secret" } })).status()).toBe(200);
  expect((await request.post("/api/os/outreach/send-now", { data: { lead_id: "x", to: "a@example.com" } })).status()).toBe(401);
  await signIn(page);
  await page.goto("/os/leads");
  const card = page.getByRole("listitem").filter({ has: page.getByRole("button", { name: /Example Fixture Snacks/ }) });
  await card.getByRole("textbox", { name: /type one/i }).fill("founder@example.com");
  await card.getByRole("button", { name: "Approve" }).click();
  await page.getByRole("button", { name: /^Approved/ }).click();
  await page.getByRole("button", { name: "Send now from Gmail" }).click();
  await page.getByRole("button", { name: "Confirm: send to founder@example.com" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Sent to Example Fixture Snacks, Inc." })).toBeVisible();
  const outbox = JSON.parse(readFileSync("/tmp/os-outreach-outbox.json", "utf8")) as { to: string; subject: string }[];
  expect(outbox).toHaveLength(1);
  expect(outbox[0].to).toBe("founder@example.com");
  await page.getByRole("button", { name: /^Sent/ }).click();
  await expect(page.getByText(/^Sequence: Running · email 1 of 5 sent/)).toBeVisible();
});

test("leads on touch screens: swipe a lead left to skip it, with undo; a short drag does nothing", async ({ request, page }) => {
  test.skip(!test.info().project.use.hasTouch, "swiping is a touch gesture");
  expect((await request.get("/api/cron/leads", { headers: { authorization: "Bearer e2e-cron-secret" } })).status()).toBe(200);
  await signIn(page);
  await page.goto("/os/leads");
  const row = page.getByRole("button", { name: /Example Fixture Snacks/ });
  await expect(row).toBeVisible();
  const card = page.locator("li.lead").filter({ has: row });
  await row.scrollIntoViewIfNeeded();
  const box = (await row.boundingBox())!;
  const cdp = await page.context().newCDPSession(page);
  const drag = async (dx: number) => {
    const y = box.y + box.height / 2;
    const x0 = box.x + box.width / 2;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x0, y }] });
    for (let i = 1; i <= 8; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x0 + (dx * i) / 8, y }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  };

  // A short drag springs back and changes nothing.
  await drag(-40);
  await expect(card).not.toHaveClass(/is-swiping|is-gone/);
  await expect(row).toBeVisible();

  // A long drag left skips it, and Undo brings it back.
  await drag(-170);
  await expect(page.getByRole("status").filter({ hasText: "Skipped Example Fixture Snacks, Inc." })).toBeVisible();
  await expect(row).toHaveCount(0);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(row).toBeVisible();
});

test("replies: the thread reads like a chat, and the suggested answer sends from Gmail in the same thread after a confirm", async ({ request, page }) => {
  expect((await request.post("/api/os/outreach/reply", { data: { lead_id: "x", body: "hi" } })).status()).toBe(401);
  expect((await request.get("/api/cron/leads", { headers: { authorization: "Bearer e2e-cron-secret" } })).status()).toBe(200);
  await signIn(page);
  await page.goto("/os/leads");
  // Send the first email, then have the founder reply (the test server can't receive mail).
  const card = page.getByRole("listitem").filter({ has: page.getByRole("button", { name: /Example Fixture Snacks/ }) });
  await card.getByRole("textbox", { name: /type one/i }).fill("founder@example.com");
  await card.getByRole("button", { name: "Approve" }).click();
  await page.getByRole("button", { name: /^Approved/ }).click();
  await page.getByRole("button", { name: "Send now from Gmail" }).click();
  await page.getByRole("button", { name: "Confirm: send to founder@example.com" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Sent to Example Fixture Snacks, Inc." })).toBeVisible();
  const book = JSON.parse(readFileSync("/tmp/os-outreach.json", "utf8")) as { enrollments: Record<string, unknown>[] };
  book.enrollments = book.enrollments.map((e) => ({ ...e, status: "replied", reply: { at: "2026-11-10T15:00:00.000Z", snippet: "Thanks Ryan, happy to talk. Does Thursday work?", handled_at: null, triage: { intent: "interested", summary: "Wants to talk Thursday.", suggested: "Thursday works. 10am Central?" } } }));
  writeFileSync("/tmp/os-outreach.json", JSON.stringify(book));

  await page.goto("/os/leads");
  const replies = page.getByRole("region", { name: "Replies" });
  await expect(replies.getByText("Thanks Ryan, happy to talk. Does Thursday work?")).toBeVisible();
  await expect(replies.getByText("Interested")).toBeVisible();
  const draft = replies.getByRole("textbox", { name: /Suggested answer/ });
  await expect(draft).toHaveValue("Thursday works. 10am Central?");
  await draft.fill("Thursday works. 10am Central? I'll send an invite.");
  // First tap arms it, second sends.
  await replies.getByRole("button", { name: "Send from Gmail" }).click();
  await replies.getByRole("button", { name: /^Send to .* now$/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "Sent from your Gmail, in the same thread." })).toBeVisible();
  const outbox = JSON.parse(readFileSync("/tmp/os-outreach-outbox.json", "utf8")) as { to: string; subject: string; body: string; threadId: string | null }[];
  expect(outbox).toHaveLength(2);
  expect(outbox[1].to).toBe("founder@example.com");
  expect(outbox[1].subject).toMatch(/^Re: /);
  expect(outbox[1].body).toBe("Thursday works. 10am Central? I'll send an invite.");
  expect(outbox[1].threadId).toBe(outbox.length && JSON.parse(readFileSync("/tmp/os-outreach.json", "utf8")).enrollments[0].thread_id);
  await expect(replies.getByRole("textbox")).toHaveCount(0);
});

test("command bar: ⌘K lists actions first, arrow keys move, Enter runs Find new leads on the Leads page", async ({ page }) => {
  test.skip(test.info().project.name !== "desk", "keyboard command bar");
  await signIn(page);
  await page.goto("/os");
  await page.getByRole("button", { name: "Search" }).click();
  const bar = page.getByRole("dialog", { name: "Search" });
  await expect(bar.getByRole("option").first()).toContainText("Answer replies");
  await expect(bar.getByRole("option").first()).toHaveAttribute("aria-selected", "true");
  await page.getByLabel("Search people, deals, bots").fill("find");
  await expect(bar.getByRole("option", { name: /Find new leads/ })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/leads$/);
  await expect(page.getByText(/Last search .*read 1 filing, 1 new/)).toBeVisible();

  // Arrow keys wrap around the list.
  await page.keyboard.press("Control+k");
  await page.getByLabel("Search people, deals, bots").fill("");
  await page.keyboard.press("ArrowUp");
  await expect(bar.getByRole("option").first()).toHaveAttribute("aria-selected", "false");
  await page.keyboard.press("ArrowDown");
  await expect(bar.getByRole("option").first()).toHaveAttribute("aria-selected", "true");
});

test("instant taps: skip shows at once, and if the save fails the lead comes back with a note", async ({ request, page }) => {
  expect((await request.get("/api/cron/leads", { headers: { authorization: "Bearer e2e-cron-secret" } })).status()).toBe(200);
  await signIn(page);
  await page.goto("/os/leads");
  const row = page.getByRole("button", { name: /Example Fixture Snacks/ });
  await expect(row).toBeVisible();

  // Hold the save for a few seconds: the lead leaves the list before the server answers.
  let release: () => void = () => undefined;
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/api/os/leads/book", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    await held;
    await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Storage is down." }) });
  });
  await row.focus();
  await page.keyboard.press("s");
  await expect(page.getByRole("status").filter({ hasText: "Skipped Example Fixture Snacks, Inc." })).toBeVisible();
  await expect(row).toHaveCount(0);

  // The save fails: it's put back and Ryan is told.
  release();
  await expect(page.getByRole("alert").filter({ hasText: "Storage is down. Put it back as it was." })).toBeVisible();
  await expect(row).toBeVisible();
});

test("loading: a green streak runs across the top from the tap until a slow page arrives", async ({ page }) => {
  test.skip(test.info().project.name !== "desk", "one viewport is enough for the streak");
  await signIn(page);
  await page.route(/\/os\/crm/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2500));
    await route.continue();
  });
  await page.goto("/os");
  await page.locator(".rail").getByRole("link", { name: /Relationships/ }).click();
  await expect(page.locator(".nav-streak")).toHaveCount(1);
  await page.waitForURL(/crm/, { timeout: 15_000 });
  await expect(page.locator(".nav-streak")).toHaveCount(0);
});

test("sign in plays the Backfield intro on the way to Today", async ({ page }) => {
  test.skip(test.info().project.name !== "desk", "one viewport is enough for the intro");
  await page.goto("/os/login");
  await page.getByLabel("Password").fill(PASSWORD);
  await page.route((url) => url.pathname === "/os" || url.pathname === "/", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.continue();
  });
  await page.getByRole("button", { name: "Enter" }).click();
  await expect(page.getByRole("status", { name: "Opening the OS" }).locator("img")).toBeVisible();
  await expect(page).toHaveURL(/\/os\/?$/, { timeout: 15_000 });
});

test("Findymail: a thesis preset fills the saved-search form, and nothing runs until Save", async ({ page }) => {
  test.skip(test.info().project.name !== "desk", "one viewport is enough for a form fill");
  await signIn(page);
  await page.goto("/os/leads");
  await page.getByText("Add a saved search").click();
  const presets = page.getByRole("group", { name: "Start from a thesis search" });
  await presets.getByRole("button", { name: "Athlete-founded brands" }).click();
  await expect(page.getByLabel("Who to find")).toHaveValue("Consumer brands founded or co-founded by professional athletes");
  await expect(page.getByRole("group", { name: "Search finds" }).getByRole("button", { name: "Founders" })).toHaveAttribute("aria-pressed", "true");
  await expect(presets.getByRole("button", { name: "Athlete-founded brands" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Save search" }).click();
  await expect(page.getByText("Consumer brands founded or co-founded by professional athletes", { exact: true })).toBeVisible();
});
