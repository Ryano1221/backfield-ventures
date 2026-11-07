import { expect, test, type Page } from "@playwright/test";
import { unlinkSync } from "node:fs";

const PASSWORD = "e2e-session-only";

// The studio store sits next to the e2e snapshot file. Every test starts empty.
test.beforeEach(() => {
  try {
    unlinkSync("/tmp/os-content-studio.json");
  } catch {
    /* nothing saved yet */
  }
  try {
    unlinkSync("/tmp/os-inspo.json");
  } catch {
    /* nothing saved yet */
  }
});

async function signIn(page: Page) {
  await page.goto("/os/login");
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Enter" }).click();
  await expect(page).toHaveURL(/\/os\/?$/);
}

test("one idea becomes channel drafts, and approval posts nothing", async ({ page }) => {
  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(new URL(request.url()).pathname);
  });
  await signIn(page);
  await page.goto("/os/studio");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Content studio.");

  await page.getByLabel("Idea").fill("Why athletes make good angels");
  await page.getByRole("group", { name: "Channels" }).getByRole("button", { name: "Newsletter" }).click();
  await page.getByRole("button", { name: "Create drafts" }).click();
  await expect(page).toHaveURL(/\/os\/studio\/c_/);
  await expect(page.getByRole("tab", { name: /LinkedIn/ })).toBeVisible();

  await page.getByRole("tab", { name: /^X/ }).click();
  const post = page.getByLabel("Post");
  await post.fill("Athletes see a lot of pitches. The good ones learn to pass fast.");
  await expect(page.locator(".sx-count")).toContainText("/ 280");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("status")).toContainText("X draft saved.");

  await page.getByRole("button", { name: "Approve this exact text" }).click();
  await expect(page.getByRole("status")).toContainText("Nothing was posted or sent.");
  await expect(page.getByRole("tab", { name: /^X/ })).toContainText("Approved");

  // Editing approved words sends them back to review.
  await page.getByLabel("Post").fill("Athletes see a lot of pitches.");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("tab", { name: /^X/ })).toContainText("In review");

  // Only the studio store was written. No send, publish, or email route.
  const other = posts.filter((path) => path !== "/api/os/studio" && path !== "/api/os/login");
  expect(other).toEqual([]);

  await page.goto("/os/studio");
  await expect(page.locator(".sx-item")).toContainText("Why athletes make good angels");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow).toBe(false);
});

test("the studio API needs a session", async ({ request }) => {
  expect((await request.get("/api/os/studio")).status()).toBe(401);
  expect((await request.post("/api/os/studio", { data: { op: "create", title: "x", channels: ["x"] } })).status()).toBe(401);
});

test("a Handoff template opens as a new draft and stays unapprovable until filled in", async ({ page }) => {
  await signIn(page);
  await page.goto("/os/studio");
  await page.getByLabel("Idea").fill("November Handoff");
  // Newsletter is one of the default channels; its layout is under More options.
  await page.getByText(/^More options/).click();
  await page.getByRole("group", { name: "Newsletter starts from" }).getByRole("button", { name: "The Handoff" }).click();
  await page.getByRole("button", { name: "Create drafts" }).click();
  await expect(page).toHaveURL(/\/os\/studio\/c_/);
  await page.getByRole("tab", { name: /Newsletter/ }).click();
  await expect(page.getByLabel("Subject")).toHaveValue(/^The Handoff, Issue/);
  await expect(page.locator(".sx-checks")).toContainText("Replace the [bracketed] template prompts.");
  await expect(page.getByRole("button", { name: "Approve this exact text" })).toBeDisabled();
});

test("what top VCs are posting: refresh reads the feeds, flags the ones that fail, and Use as an idea starts a draft", async ({ page, request }) => {
  expect((await request.post("/api/os/inspo", { data: { op: "refresh" } })).status()).toBe(401);
  await signIn(page);
  await page.goto("/os/studio");
  const feed = page.getByRole("region", { name: "What top VCs are posting" });
  await expect(feed.getByText("Nothing read yet.")).toBeVisible();
  await feed.getByRole("button", { name: "Refresh now" }).click();
  await expect(feed.getByRole("status")).toContainText("2 new posts.");
  await expect(feed.getByText("FIXTURE: Why the best seed funds say no 99% of the time")).toBeVisible();
  // LinkedIn and X wait for an Apify key, and say so.
  await expect(feed.getByText(/LinkedIn and X posts start once an Apify key/)).toBeVisible();

  // Sources that couldn't be read are flagged with the reason.
  await feed.getByText(/^Who you follow/).click();
  await expect(feed.getByText(/not reading/)).toBeVisible();
  await expect(feed.getByText("The site answered 404.").first()).toBeVisible();

  // Add someone by X handle, then remove them.
  await feed.getByLabel(/^Add someone/).fill("@fixturevc");
  await feed.getByRole("button", { name: "Add" }).click();
  await expect(feed.getByRole("status")).toContainText("Added.");
  await feed.getByRole("button", { name: "Remove @fixturevc" }).click();
  await expect(feed.getByRole("button", { name: "Remove @fixturevc" })).toHaveCount(0);

  // Use as an idea fills in the composer with the post and its link.
  await feed.getByRole("button", { name: "Use as an idea" }).first().click();
  await expect(page.getByLabel("Idea")).toHaveValue("FIXTURE: Why the best seed funds say no 99% of the time");
  await expect(page.getByLabel(/^Link or name/)).toHaveValue("https://example.com/20vc/no-99");
  await expect(page.getByLabel(/^Notes for the writer/)).toHaveValue(/^Inspired by 20VC \(Harry Stebbings\)/);
  await page.getByRole("button", { name: "Create drafts" }).click();
  await expect(page).toHaveURL(/\/os\/studio\/c_/);
});
