import { expect, test, type ConsoleMessage, type Page, type Response } from "@playwright/test";
import { appendFileSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildCrawlSnapshot, crawlPaths, EDGE_NEEDLES } from "./fixtures/crawl-snapshot";

const PASSWORD = "e2e-session-only";
const SNAPSHOT = "/tmp/os-e2e-none.json";
const LOG_DIR = path.join("test-results", "os-crawl");

const SESSION_APIS = [
  "/api/os/snapshot",
  "/api/os/logo",
  "/api/os/logout",
  "/api/os/action",
  "/api/os/actions/mine",
  "/api/os/decide",
  "/api/os/email/compose/send",
  "/api/os/email/compose/test-send",
  "/api/os/email/subscribers/export",
];

const TOKEN_APIS = [
  "/api/os/ingest",
  "/api/os/decisions/answered",
  "/api/os/decisions/ack",
  "/api/os/actions/pending",
  "/api/os/actions/ack",
];

type Finding = { viewport: string; route: string; check: string; detail: string; screenshot: string };
type Bag = { errors: string[]; bad: string[] };

test.describe("logged out", () => {
  test("every OS route redirects and every API denies access", async ({ request }) => {
    test.setTimeout(120_000);
    const paths = crawlPaths(buildCrawlSnapshot());
    for (const route of paths) {
      const response = await request.get(route, { maxRedirects: 0 });
      expect(response.status(), route).toBe(303);
      expect(response.headers().location || "", route).toContain("/login");
    }
    const login = await request.get("/os/login", { maxRedirects: 0 });
    expect(login.status()).toBe(200);

    for (const route of SESSION_APIS) {
      for (const method of ["GET", "POST"] as const) {
        const response = method === "GET" ? await request.get(route) : await request.post(route, { data: {} });
        expect(response.status(), `${method} ${route}`).toBe(401);
      }
    }
    for (const route of TOKEN_APIS) {
      for (const method of ["GET", "POST"] as const) {
        const response = method === "GET" ? await request.get(route) : await request.post(route, { data: {} });
        const status = response.status();
        expect([401, 403, 405, 415, 503], `${method} ${route} -> ${status}`).toContain(status);
        const body = await response.text();
        expect(body, `${method} ${route}`).not.toMatch(/"pitches"|"people"|"decisions"/);
      }
    }
    const loginGet = await request.get("/api/os/login");
    expect([401, 405]).toContain(loginGet.status());
    const loginPost = await request.post("/api/os/login", { data: { password: "incorrect-example" } });
    expect(loginPost.status()).toBe(401);
  });
});

test.describe("signed in", () => {
  let bag: Bag;

  test.beforeEach(async ({ page }) => {
    writeFileSync(SNAPSHOT, JSON.stringify(buildCrawlSnapshot()));
    bag = arm(page);
    page.setDefaultTimeout(8_000);
    page.setDefaultNavigationTimeout(12_000);
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => undefined);
    await page.goto("/os/login");
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Enter" }).click();
    await expect(page).toHaveURL(/\/os\/?$/);
  });

  test.afterEach(() => {
    try {
      unlinkSync(SNAPSHOT);
    } catch {
      /* already removed */
    }
  });

  test("crawls every route, control, and desktop layout", async ({ page }, testInfo) => {
    test.setTimeout(900_000);
    const size = page.viewportSize() ?? { width: 0, height: 0 };
    const viewport = `${size.width}x${size.height}`;
    const desktop = size.width >= 1000;
    const phone = size.width < 500;
    const findings: Finding[] = [];
    mkdirSync(LOG_DIR, { recursive: true });
    const liveLog = path.join(LOG_DIR, `errors-${testInfo.project.name}.log`);
    writeFileSync(liveLog, "");
    const shot = async (route: string, check: string) => {
      const file = path.join(LOG_DIR, `${testInfo.project.name}-${size.width}-${slug(route)}-${slug(check)}.png`);
      mkdirSync(LOG_DIR, { recursive: true });
      await page.screenshot({ path: file, fullPage: false }).catch(() => undefined);
      return file;
    };
    const note = async (route: string, check: string, detail: string) => {
      const screenshot = findings.some((item) => item.route === route && item.viewport === viewport) ? "" : await shot(route, check);
      const finding = { viewport, route, check, detail, screenshot };
      findings.push(finding);
      appendFileSync(liveLog, JSON.stringify(finding) + "\n");
    };

    for (const route of crawlPaths(buildCrawlSnapshot())) {
      try {
        await crawlRoute(page, route, { desktop, phone, viewport, note, bag });
      } catch (error) {
        await note(route, "crash", error instanceof Error ? error.message : String(error));
        await page.goto(route, { waitUntil: "domcontentloaded" }).catch(() => undefined);
      }
    }
    await signOut(page, note);

    mkdirSync(LOG_DIR, { recursive: true });
    const log = path.join(LOG_DIR, `errors-${testInfo.project.name}.log`);
    writeFileSync(log, findings.map((item) => JSON.stringify(item)).join("\n") + (findings.length ? "\n" : ""));
    expect(findings, findings.map((item) => `${item.viewport} ${item.route} ${item.check}: ${item.detail}`).join("\n")).toEqual([]);
  });
});

function arm(page: Page): Bag {
  const bag: Bag = { errors: [], bad: [] };
  page.on("pageerror", (error) => bag.errors.push(error.message));
  page.on("console", (msg: ConsoleMessage) => {
    const text = msg.text();
    if (msg.type() === "warning" && /hydration|did not match|server rendered/i.test(text)) bag.errors.push(text);
    if (msg.type() !== "error") return;
    if (/Download the React DevTools/.test(text)) return;
    bag.errors.push(text);
  });
  page.on("requestfailed", (request) => {
    const url = request.url();
    const reason = request.failure()?.errorText || "";
    if (/ERR_ABORTED|favicon/.test(`${url} ${reason}`)) return;
    bag.bad.push(`failed ${url} ${reason}`);
  });
  page.on("response", (res: Response) => {
    if (res.status() < 400) return;
    const url = res.url();
    if (/favicon/.test(url)) return;
    bag.bad.push(`${res.status()} ${url}`);
  });
  return bag;
}

async function crawlRoute(
  page: Page,
  route: string,
  ctx: { desktop: boolean; phone: boolean; viewport: string; note: (route: string, check: string, detail: string) => Promise<void>; bag: Bag },
) {
  const errorAt = ctx.bag.errors.length;
  const badAt = ctx.bag.bad.length;
  console.log(`crawl ${ctx.viewport} ${route}`);
  try {
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    if (response && response.status() >= 400) await ctx.note(route, "response", `document status ${response.status()}`);
  } catch (error) {
    await ctx.note(route, "navigation", error instanceof Error ? error.message : String(error));
    return;
  }
  const headed = await page.getByRole("heading", { level: 1 }).first().waitFor({ timeout: 15_000 }).then(() => true).catch(() => false);
  if (!headed) await ctx.note(route, "heading", "no level-1 heading");

  const issues = await page.evaluate(domAudit, { desktop: ctx.desktop, phone: ctx.phone }).catch(() => []);
  for (const issue of issues) await ctx.note(route, issue.check, issue.detail);
  for (const error of ctx.bag.errors.slice(errorAt)) await ctx.note(route, "console", error.slice(0, 500));
  for (const bad of ctx.bag.bad.slice(badAt)) await ctx.note(route, "network", bad.slice(0, 500));

  if (/\/os\/(deals|crm|d)\/[^/]+$/.test(route)) await checkBack(page, route, ".eyebrow a", ctx.note);
  if (route.startsWith("/os/email")) await checkBack(page, route, ".crumb a", ctx.note);
  if (route === "/os/bots") await openBotSheets(page, route, ctx);
  await tapControls(page, route, ctx.note);
  await page.keyboard.press("Escape").catch(() => undefined);
}

async function checkBack(page: Page, route: string, selector: string, note: (route: string, check: string, detail: string) => Promise<void>) {
  const back = page.locator(selector).first();
  if (!(await back.count()) || !(await back.isVisible().catch(() => false))) {
    await note(route, "back", "no back control");
    return;
  }
  const before = new URL(page.url()).pathname;
  let left = false;
  for (let attempt = 0; attempt < 2 && !left; attempt++) {
    await back.scrollIntoViewIfNeeded().catch(() => undefined);
    await back.click({ timeout: 4_000 }).catch(async (error: Error) => {
      if (attempt === 1) await note(route, "back", error.message);
    });
    left = await page.waitForURL((url) => url.pathname !== before, { timeout: 4_000 }).then(() => true).catch(() => false);
  }
  if (!left) {
    await note(route, "back", "back control did not leave the page");
    return;
  }
  await page.goBack({ waitUntil: "domcontentloaded", timeout: 8_000 }).catch(async () => {
    await note(route, "back", "browser back failed");
  });
  const returned = await page.waitForURL((url) => url.pathname === before, { timeout: 8_000 }).then(() => true).catch(() => false);
  if (!returned) {
    await note(route, "back", `browser back landed on ${page.url()} instead of ${before}`);
    await page.goto(route, { waitUntil: "domcontentloaded" }).catch(() => undefined);
  }
}

async function openBotSheets(
  page: Page,
  route: string,
  ctx: { note: (route: string, check: string, detail: string) => Promise<void>; bag: Bag },
) {
  const buttons = page.locator(".bots-person-open");
  const count = await buttons.count();
  if (count < 40) await ctx.note(route, "bots", `expected 40 or more bots, found ${count}`);
  for (let i = 0; i < count; i++) {
    const button = buttons.nth(i);
    await button.scrollIntoViewIfNeeded().catch(() => undefined);
    const name = ((await button.innerText().catch(() => "")) || `bot ${i}`).split("\n")[0]?.trim() || `bot ${i}`;
    await button.click({ noWaitAfter: true, timeout: 3_000 }).catch(async (error: Error) => {
      await ctx.note(route, "bot-sheet", `${name}: ${error.message}`);
    });
    const dialog = page.locator(".bots-sheet");
    if (!(await dialog.isVisible().catch(() => false))) {
      await ctx.note(route, "bot-sheet", `${name} did not open a sheet`);
      continue;
    }
    const text = await dialog.innerText().catch(() => "");
    const bad = text.match(/\b(undefined|null|NaN)\b|Invalid Date|\[object Object\]/);
    if (bad) await ctx.note(route, "bot-sheet", `${name} shows ${bad[0]}`);
    const close = dialog.getByRole("button", { name: "Close" });
    await close.click({ noWaitAfter: true, timeout: 3_000 }).catch(async (error: Error) => {
      await ctx.note(route, "bot-sheet", `${name} close: ${error.message}`);
    });
    if (await dialog.isVisible().catch(() => false)) await ctx.note(route, "bot-sheet", `${name} close did nothing`);
  }
}

async function tapControls(page: Page, route: string, note: (route: string, check: string, detail: string) => Promise<void>) {
  const plan = await page.evaluate((needles) => {
    const visible = (el: Element) => {
      const node = el as HTMLElement;
      const style = getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden" || style.pointerEvents === "none") return false;
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };
    const items: { i: string; name: string; href: string; target: string; kind: string }[] = [];
    let n = 0;
    const seen = new Map<string, number>();
    for (const el of document.querySelectorAll("button, a, [role='button'], [role='tab'], summary, .deck-state")) {
      if (!visible(el)) continue;
      const name = (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80);
      if (/^sign out$/i.test(name)) continue;
      const href = el.getAttribute("href") || "";
      const card = el.closest(".deal-card, .inbox-card, .bots-person, .bots-need");
      const edge = Boolean(card && needles.some((needle) => (card.textContent || "").includes(needle)));
      const key = name || href || el.tagName;
      const count = seen.get(key) || 0;
      seen.set(key, count + 1);
      const repeated = Boolean(card) && count > 0 && !edge;
      if (repeated) continue;
      if (el.getAttribute("aria-current") === "page" || el.getAttribute("aria-pressed") === "true") continue;
      if (el.classList.contains("on") && el.closest(".tabs, .rail, .tabbar")) continue;
      if (href && (href.startsWith("/os") || href === "/") && !/back|today|deals|people/i.test(name)) continue;
      if (/^(great|good|maybe|no)$/i.test(name) && !edge) continue;
      const id = `c${n++}`;
      el.setAttribute("data-crawl-i", id);
      items.push({ i: id, name, href, target: el.getAttribute("target") || "", kind: el.tagName.toLowerCase() });
      if (items.length >= 24) break;
    }
    return items;
  }, EDGE_NEEDLES).catch(async (error: unknown) => {
    await note(route, "tap", error instanceof Error ? error.message : String(error));
    return [] as { i: string; name: string; href: string; target: string; kind: string }[];
  });

  for (const item of plan) {
    const el = page.locator(`[data-crawl-i="${item.i}"]`);
    if (!(await el.count())) continue;
    if (!(await el.isVisible().catch(() => false))) continue;
    if (await el.evaluate((node) => (node as HTMLButtonElement).disabled || node.getAttribute("aria-disabled") === "true").catch(() => false)) continue;
    if (item.href.startsWith("mailto:") || item.href.startsWith("tel:")) continue;
    if (item.kind === "button" && (await el.getAttribute("type")) === "submit") {
      const form = el.locator("xpath=ancestor::form[1]");
      const name = form.locator("input[type='text'], input:not([type])");
      if (await name.count()) await name.first().fill("Fixture").catch(() => undefined);
      const email = form.locator("input[type='email']");
      if (await email.count()) await email.first().fill("owner@example.com").catch(() => undefined);
    }
    const beforeUrl = page.url();
    const before = await signature(page);
    if (item.target === "_blank") {
      const popup = page.waitForEvent("popup", { timeout: 1_500 }).catch(() => null);
      await el.click({ noWaitAfter: true, timeout: 2_000 }).catch(async (error: Error) => {
        await note(route, "tap", `${item.name || item.href}: ${error.message}`);
      });
      const opened = await popup;
      if (!opened) await note(route, "tap", `${item.name || item.href} did not open`);
      else await opened.close().catch(() => undefined);
      continue;
    }
    const clicked = await el.click({ noWaitAfter: true, timeout: 2_000 }).then(() => true).catch(async (error: Error) => {
      await note(route, "tap", `${item.name || item.href}: ${error.message}`);
      return false;
    });
    if (!clicked) continue;
    await page.waitForTimeout(120);
    const afterUrl = page.url();
    if (new URL(afterUrl).pathname !== new URL(beforeUrl).pathname) {
      await page.goBack({ waitUntil: "domcontentloaded", timeout: 8_000 }).catch(async () => {
        await page.goto(route, { waitUntil: "domcontentloaded" }).catch(() => undefined);
      });
      continue;
    }
    let after = await signature(page);
    const started = Date.now();
    while (before && after === before && Date.now() - started < 700) {
      await page.waitForTimeout(100);
      after = await signature(page);
    }
    if (before && after === before) await note(route, "tap", `${item.name || item.href || item.kind} did nothing`);
    if ((await page.locator("[role='dialog']").count()) > 0) {
      const close = page.locator("[role='dialog']").getByRole("button", { name: /close/i }).first();
      if (await close.count()) await close.click().catch(() => undefined);
      else await page.keyboard.press("Escape").catch(() => undefined);
    }
  }
}

async function signOut(page: Page, note: (route: string, check: string, detail: string) => Promise<void>) {
  const direct = page.getByRole("button", { name: "Sign out" });
  if (!(await direct.first().isVisible().catch(() => false))) {
    const menu = page.getByRole("button", { name: "Menu" });
    if (await menu.isVisible().catch(() => false)) await menu.click().catch(() => undefined);
  }
  const button = page.getByRole("button", { name: "Sign out" });
  if (!(await button.first().isVisible().catch(() => false))) {
    await note("/os", "sign-out", "Sign out is not visible");
    return;
  }
  await button.first().click({ noWaitAfter: true, timeout: 4_000 }).catch(async (error: Error) => {
    await note("/os", "sign-out", error.message);
  });
  await page.waitForURL(/login/, { timeout: 10_000 }).catch(() => note("/os", "sign-out", "Sign out did not reach login"));
}

async function signature(page: Page): Promise<string> {
  return page.evaluate(() => {
    const text = `${document.querySelector("main")?.textContent || ""} ${document.querySelector(".toasts")?.textContent || ""}`.replace(/\s+/g, " ").slice(0, 800);
    const dialogs = [...document.querySelectorAll("[role='dialog']")].map((el) => el.getAttribute("aria-label") || "dialog").join(",");
    const pressed = [...document.querySelectorAll("[aria-pressed='true']")].map((el) => (el.textContent || "").trim().slice(0, 24)).join(",");
    const open = document.querySelectorAll("details[open]").length;
    const active = document.activeElement?.getAttribute("aria-label") || document.activeElement?.tagName || "";
    return JSON.stringify({ path: location.pathname, text, dialogs, pressed, open, scroll: window.scrollY, active });
  }).catch(() => "");
}

function domAudit({ desktop, phone }: { desktop: boolean; phone: boolean }) {
  const issues: { check: string; detail: string }[] = [];
  const text = document.body.innerText || "";
  const bad = text.match(/\b(undefined|null|NaN)\b|Invalid Date|\[object Object\]/);
  if (bad) issues.push({ check: "text", detail: bad[0] });
  if (/This page could not be found|Application error|Internal Server Error|Missing page|Unhandled Runtime Error|\bNot found\b/.test(text)) {
    issues.push({ check: "error-page", detail: "error or not-found text" });
  }
  if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) {
    issues.push({ check: "overflow", detail: `scrollWidth ${document.documentElement.scrollWidth} > ${document.documentElement.clientWidth}` });
  }

  const visible = (el: Element) => {
    const node = el as HTMLElement;
    const style = getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden") return false;
    const rect = node.getBoundingClientRect();
    return rect.width > 1 && rect.height > 1;
  };
  const bars = [...document.querySelectorAll(".appbar, .tabbar, .mbar, .primary-wrap, .crumb, .rail")].filter((el) => {
    const pos = getComputedStyle(el).position;
    return visible(el) && (pos === "fixed" || pos === "sticky");
  });
  const overlapping = (a: DOMRect, b: DOMRect) => {
    const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return w > 8 && h > 8;
  };
  const wide = [...document.querySelectorAll("a, button, input, h1, .segment")].find((el) => {
    if (!visible(el)) return false;
    const rect = el.getBoundingClientRect();
    return rect.right > window.innerWidth + 1 || rect.left < -1;
  });
  if (wide) issues.push({ check: "overflow", detail: `${labelOf(wide)} extends past the viewport` });
  const topBars = bars.filter((bar) => bar.getBoundingClientRect().top < 80);
  const bottomBars = bars.filter((bar) => bar.getBoundingClientRect().bottom > window.innerHeight - 80);
  const hitBar = (barList: Element[]) => {
    for (const el of document.querySelectorAll("a, button, input, textarea, select, summary, [role='button']")) {
      if (!visible(el) || bars.some((bar) => bar.contains(el))) continue;
      const rect = el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) continue;
      for (const bar of barList) {
        if (overlapping(rect, bar.getBoundingClientRect())) {
          issues.push({ check: "overlap", detail: `${labelOf(el)} overlaps ${labelOf(bar)}` });
          return;
        }
      }
    }
  };
  hitBar(topBars);
  const previous = window.scrollY;
  window.scrollTo(0, document.documentElement.scrollHeight);
  hitBar(bottomBars);
  window.scrollTo(0, previous);

  if (phone) {
    const small: string[] = [];
    for (const el of document.querySelectorAll("a, button, input, textarea, select, summary, [role='button'], [role='tab']")) {
      if (!visible(el)) continue;
      if ((el as HTMLButtonElement).disabled) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width >= 44 && rect.height >= 44) continue;
      small.push(`${labelOf(el)} ${Math.round(rect.width)}x${Math.round(rect.height)}`);
      if (small.length >= 8) break;
    }
    if (small.length) issues.push({ check: "target", detail: small.join("; ") });
  }

  if (desktop) {
    const main = document.querySelector("main");
    if (main) {
      const rect = main.getBoundingClientRect();
      const max = getComputedStyle(main).maxWidth;
      const maxPx = max.endsWith("px") ? Number.parseFloat(max) : null;
      const noCap = max === "none" || max === "100%" || (maxPx != null && maxPx >= window.innerWidth - 16);
      const parentW = main.parentElement?.getBoundingClientRect().width ?? window.innerWidth;
      if (noCap && rect.width >= parentW - 2 && parentW > 720) {
        issues.push({ check: "measure", detail: `main max-width ${max} fills ${Math.round(parentW)}px` });
      }
    }
    const heading = document.querySelector("h1");
    if (heading) {
      const rect = heading.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) issues.push({ check: "layout", detail: "heading is outside the first screen" });
    }
    window.scrollTo(0, 360);
    const stuck = [...document.querySelectorAll("body *")].filter((el) => {
      const pos = getComputedStyle(el).position;
      if (pos !== "sticky" && pos !== "fixed") return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 8 && rect.height > 8 && rect.bottom > 0 && rect.top < window.innerHeight;
    });
    for (let i = 0; i < stuck.length; i++) {
      for (let j = i + 1; j < stuck.length; j++) {
        if (stuck[i].contains(stuck[j]) || stuck[j].contains(stuck[i])) continue;
        if (!overlapping(stuck[i].getBoundingClientRect(), stuck[j].getBoundingClientRect())) continue;
        issues.push({ check: "sticky", detail: `${labelOf(stuck[i])} overlaps ${labelOf(stuck[j])}` });
      }
    }
    window.scrollTo(0, 0);

    const styleRules: string[] = [];
    const touchRules: string[] = [];
    const walk = (rules: CSSRuleList, media = "") => {
      for (const rule of rules) {
        if (rule instanceof CSSMediaRule) walk(rule.cssRules, `${media} ${rule.conditionText}`);
        else if (rule instanceof CSSStyleRule) {
          styleRules.push(rule.selectorText);
          if (/pointer:\s*coarse|hover:\s*none/.test(media)) {
            const display = rule.style.getPropertyValue("display");
            const visibility = rule.style.getPropertyValue("visibility");
            if ((display && display !== "none") || visibility === "visible") touchRules.push(`${rule.selectorText} via ${media.trim()}`);
          }
        }
      }
    };
    for (const sheet of document.styleSheets) {
      try {
        walk(sheet.cssRules);
      } catch {
        /* ignore unreadable sheets */
      }
    }
    const covered = (el: Element, pseudo: string) =>
      styleRules.some((selector) =>
        selector.split(",").some((part) => {
          if (!part.includes(pseudo)) return false;
          const subject = part.slice(0, part.indexOf(pseudo)).trim();
          if (!subject) return false;
          try {
            return el.matches(subject);
          } catch {
            return false;
          }
        }),
      );
    const hoverMiss: string[] = [];
    const focusMiss: string[] = [];
    for (const el of document.querySelectorAll("a[href], button, summary, input, textarea, select, [role='button']")) {
      if (!visible(el) || (el as HTMLButtonElement).disabled) continue;
      if (!covered(el, ":hover") && hoverMiss.length < 6) hoverMiss.push(labelOf(el));
      if (!covered(el, ":focus") && !covered(el, ":focus-visible") && focusMiss.length < 6) focusMiss.push(labelOf(el));
    }
    if (hoverMiss.length) issues.push({ check: "hover", detail: hoverMiss.join("; ") });
    if (focusMiss.length) issues.push({ check: "focus", detail: focusMiss.join("; ") });
    if (touchRules.length) issues.push({ check: "touch-only", detail: touchRules.slice(0, 6).join("; ") });
    for (const swipe of document.querySelectorAll(".swipe")) {
      const approve = [...swipe.querySelectorAll("button")].some((button) => /approve/i.test(button.textContent || "") && visible(button));
      if (!approve) issues.push({ check: "touch-only", detail: "swipe action has no clickable approve" });
    }
    if (/\b(pinch|double-tap)\b/i.test(text) && !/\b(click|scroll)\b/i.test(text)) {
      issues.push({ check: "touch-only", detail: "instructions only describe touch gestures" });
    }
    const nav = document.querySelector(".email") ? ["Dashboard", "Subscribers", "Compose"] : ["Today", "Deals", "People", "Bots", "Ask"];
    const missing = nav.filter((name) => ![...document.querySelectorAll("a, button")].some((el) => visible(el) && (el.textContent || "").trim().startsWith(name)));
    if (missing.length) issues.push({ check: "touch-only", detail: `not reachable with a pointer: ${missing.join(", ")}` });
  }

  return issues;

  function labelOf(el: Element): string {
    const name = el.getAttribute("aria-label") || (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40);
    return `${el.tagName.toLowerCase()}${el.className ? "." + String(el.className).split(" ")[0] : ""}${name ? ` "${name}"` : ""}`;
  }
}

function slug(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 80) || "page";
}
