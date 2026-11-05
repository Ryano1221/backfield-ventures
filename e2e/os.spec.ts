import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, unlinkSync } from "node:fs";

test.beforeAll(() => {
  try {
    unlinkSync("/tmp/os-e2e-none.json");
  } catch {
    /* The crawl test is the only writer of this file. */
  }
});

const PASSWORD = "e2e-session-only";

test.describe("signed in", () => {
  test.beforeEach(async ({ page }) => {
    (page as Page & { bag: Bag }).bag = arm(page);
    await page.goto("/os/login");
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Enter" }).click();
    await expect(page).toHaveURL(/\/os\/?$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

test("gate, pages, and actions stay clean", async ({ page }) => {
  test.setTimeout(120_000);
  const bag = (page as Page & { bag: Bag }).bag;
  const width = page.viewportSize()?.width ?? 0;
  const dir = `/opt/cursor/artifacts/os-redesign-pass3/${width}`;
  mkdirSync(dir, { recursive: true });

  const pages: { path: string; name: string; text: RegExp }[] = [
    { path: "/os", name: "today", text: /waiting on you|You're clear/ },
    { path: "/os/deals", name: "deals", text: /pitches/i },
    { path: "/os/deals/pitch_fixture-northwind", name: "pitch", text: /Northwind/ },
    { path: "/os/crm", name: "people", text: /people/i },
    { path: "/os/crm/fix-ada", name: "person", text: /Ada North/ },
    { path: "/os/bots", name: "bots", text: /Needs you/ },
    { path: "/os/activity", name: "activity", text: /What ran|Activity/ },
    { path: "/os/waiting", name: "waiting", text: /office/i },
    { path: "/os/email", name: "email", text: /Email|Dashboard/ },
    { path: "/os/d/fix-dec-1", name: "decision", text: /Casey|FIXTURE/ },
  ];

  for (const item of pages) {
    await visit(page, item.path);
    await expect(page.locator("body")).toContainText(item.text);
    await expect(page.locator("select")).toHaveCount(0);
    await shot(page, `${dir}/${item.name}.png`);
    await clean(page, bag);
  }

  await visit(page, "/os");
  const cream = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(cream).toBe("rgb(240, 237, 232)");
  await expect(page.locator(".greet")).toHaveText(chicagoToday());
  const cards = page.locator(".inbox-card");
  const cardCount = await cards.count();
  for (let index = 0; index < cardCount; index += 1) {
    await expect(cards.nth(index).locator(".inbox-type")).toBeVisible();
    await expect(cards.nth(index).locator(".logo.fb")).toBeVisible();
  }
  const preview = cards.first().locator(".inbox-line");
  await expect(preview).toHaveCSS("-webkit-line-clamp", "2");
  await cards.first().getByRole("button", { name: "Read" }).click();
  await expect(cards.first()).toHaveClass(/is-open/);
  await expect(preview).toHaveCSS("-webkit-line-clamp", "none");

  const before = await page.locator(".inbox-card").count();
  expect(before).toBeGreaterThan(0);
  const card = page.locator(".swipe").first();
  await card.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const fire = (type: string, x: number) => {
      el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: rect.top + 36, pointerId: 1, pointerType: "touch" }));
    };
    fire("pointerdown", rect.left + 12);
    fire("pointermove", rect.left + 180);
    fire("pointerup", rect.left + 180);
  });
  await expect(page.getByRole("button", { name: "Undo" })).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.locator(".inbox-card")).toHaveCount(before);

  await page.locator(".inbox-card").first().getByRole("button", { name: "Not now" }).evaluate((el: HTMLButtonElement) => el.click());
  await expect(page.getByRole("button", { name: "Undo" })).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();

  await page.locator(".inbox-card").first().getByRole("button", { name: "Approve", exact: true }).evaluate((el: HTMLButtonElement) => el.click());
  await expect(page.getByRole("status")).toContainText("Approved");
  await expect(page.locator(".toast")).toHaveCount(1);
  const toastBox = await page.locator(".toast").boundingBox();
  expect(toastBox && toastBox.y).toBeGreaterThan(width < 700 ? 400 : 200);
  await page.getByRole("button", { name: "Undo" }).click();

  await page.getByRole("button", { name: "Search" }).click();
  await page.getByLabel("Search people, deals, bots").fill("Northwind");
  await page.getByRole("link", { name: /Northwind/ }).evaluate((el: HTMLAnchorElement) => el.click());
  await expect(page).toHaveURL(/pitch_fixture-northwind/);
  await expect(page.locator("body")).toContainText("Northwind");

  await visit(page, "/os/deals");
  const filters = page.getByRole("group", { name: "Filter pitches" });
  const filterStyle = await filters.evaluate((el) => {
    const style = getComputedStyle(el);
    return { wrap: style.flexWrap, overflow: style.overflowX };
  });
  expect(filterStyle.wrap).toBe("nowrap");
  expect(filterStyle.overflow).toBe("auto");
  const cedar = page.locator(".deal-card", { hasText: "Cedar" });
  await expect(cedar.getByRole("link", { name: "Deck" })).toHaveCount(0);
  await expect(cedar.locator(".deck-state")).toHaveCount(0);
  await page.locator(".deal-card").first().getByRole("button", { name: "great" }).click();
  await expect(page.getByRole("status")).toContainText(/Rated/);

  const askOpen = width < 700 ? page.locator(".tabbar").getByRole("button", { name: "Ask" }) : page.locator(".rail-ask");
  await askOpen.click();
  await expect(page.getByRole("dialog", { name: "Ask the firm" })).toBeVisible();
  await expect(page.getByText("Nothing sends until you approve the exact text.")).toBeVisible();
  await page.getByRole("dialog", { name: "Ask the firm" }).getByRole("button", { name: "The office" }).click();
  await page.getByRole("dialog", { name: "Which bot" }).getByRole("button", { name: "FIXTURE Executive" }).click();
  const ask = page.getByRole("dialog", { name: "Ask the firm" });
  const field = ask.getByLabel("Ask the firm");
  const chip = ask.getByRole("button", { name: "FIXTURE Executive" });
  const chipBox = await chip.boundingBox();
  const fieldBox = await field.boundingBox();
  if (!chipBox || !fieldBox) throw new Error("ask layout missing");
  expect(chipBox.y).toBeLessThan(fieldBox.y);
  await field.fill("What is the example status?");
  await ask.locator(".ask-compose").getByRole("button", { name: "Send" }).click();
  await field.fill("What is the example status?");
  await ask.locator(".ask-compose").getByRole("button", { name: "Send" }).click();
  await expect(ask.locator(".bubble", { hasText: "What is the example status?" })).toHaveCount(1);
  await expect(ask.locator(".bubble-status").first()).toContainText("Not picked up");
  await shot(page, `${dir}/ask.png`);
  await page.locator(".sheet-close").click();

  await visit(page, "/os/crm");
  const peopleText = await page.locator("main").innerText();
  expect(peopleText.indexOf("FIXTURE Ada North")).toBeGreaterThan(0);
  expect(peopleText.indexOf("FIXTURE Ada North")).toBeLessThan(peopleText.indexOf("Stages"));

  await visit(page, "/os/crm/fix-ada");
  await page.getByRole("button", { name: /Stage/ }).click();
  await page.getByRole("dialog", { name: /Stage for/ }).getByRole("button", { name: "Ready" }).click();
  await page.getByLabel("Follow-up for FIXTURE Ada North").fill("Draft the example follow-up.");
  await page.getByRole("button", { name: "Queue follow-up" }).click();
  await page.getByLabel("Note for FIXTURE Ada North").fill("Example note.");
  await page.getByRole("button", { name: "Save note" }).click();
  await page.getByRole("button", { name: "Hold", exact: true }).click();
  await expect(page.getByRole("status").last()).toBeVisible();

  await visit(page, "/os/bots");
  if (width < 700) {
    await expect(page.locator(".ofc-stage")).toHaveCount(0);
    await page.getByRole("button", { name: "Map" }).click();
    await expect(page.locator(".ofc-stage")).toBeVisible();
    await page.getByRole("button", { name: "List" }).click();
    await expect(page.locator(".ofc-stage")).toHaveCount(0);
  }
  await page.locator(".bots-sum").getByRole("button", { name: /Needs you/ }).click();
  const needs = page.locator(".bots-need").first();
  await needs.getByRole("button", { name: "Pause" }).evaluate((el: HTMLButtonElement) => el.click());
  await expect(needs.getByRole("button", { name: "Resume" })).toBeVisible();
  await needs.getByRole("button", { name: "Resume" }).evaluate((el: HTMLButtonElement) => el.click());

  await clean(page, bag);
});
});

test("signed-out dashboard stays at the gate", async ({ request }) => {
  const home = await request.get("/os", { maxRedirects: 0 });
  expect(home.status()).toBe(303);
  const api = await request.get("/api/os/snapshot");
  expect(api.status()).toBe(401);
});

type Bag = { errors: string[]; bad: string[] };

function arm(page: Page): Bag {
  const bag: Bag = { errors: [], bad: [] };
  page.on("pageerror", (error) => bag.errors.push(error.message));
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (/favicon|Download the React DevTools|\/api\/os\/logo/.test(text)) return;
    bag.errors.push(text);
  });
  page.on("response", (res) => {
    const url = res.url();
    if (res.status() < 400) return;
    if (/favicon|\/api\/os\/logo/.test(url)) return;
    bag.bad.push(`${res.status()} ${url}`);
  });
  page.addInitScript(() => {
    const store = window as Window & { __cls?: number };
    store.__cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & { value?: number; hadRecentInput?: boolean };
        if (!shift.hadRecentInput && typeof shift.value === "number") store.__cls = (store.__cls || 0) + shift.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  return bag;
}

async function visit(page: Page, path: string) {
  await page.evaluate(() => {
    (window as Window & { __cls?: number }).__cls = 0;
  });
  await page.goto(path);
  await page.getByRole("heading", { level: 1 }).waitFor();
}

async function clean(page: Page, bag: Bag) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow, "horizontal overflow").toBe(false);
  const cls = await page.evaluate(() => (window as Window & { __cls?: number }).__cls || 0);
  expect(cls, "layout shift").toBeLessThanOrEqual(0.05);
  expect(bag.errors, "console errors").toEqual([]);
  expect(bag.bad, "failed responses").toEqual([]);
  await expect(page.locator("body")).not.toContainText("This page could not be found");
  await expect(page.locator("body")).not.toContainText("Application error");
  await expect(page.locator("body")).not.toContainText("ERR_CONNECTION");
}

function chicagoToday(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "long",
    month: "short",
    day: "numeric",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("weekday")}, ${get("month")} ${get("day")}`;
}

async function shot(page: Page, path: string) {
  const text = await page.locator("body").innerText();
  expect(text).not.toMatch(/ERR_CONNECTION|Application error|This page could not be found|Internal Server Error/);
  await page.screenshot({ path, fullPage: false });
}
