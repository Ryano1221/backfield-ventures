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
  // Newsletter is one of the default channels.
  await page.getByRole("group", { name: "Newsletter starts from" }).getByRole("button", { name: "The Handoff" }).click();
  await page.getByRole("button", { name: "Create drafts" }).click();
  await expect(page).toHaveURL(/\/os\/studio\/c_/);
  await page.getByRole("tab", { name: /Newsletter/ }).click();
  await expect(page.getByLabel("Subject")).toHaveValue(/^The Handoff, Issue/);
  await expect(page.locator(".sx-checks")).toContainText("Replace the [bracketed] template prompts.");
  await expect(page.getByRole("button", { name: "Approve this exact text" })).toBeDisabled();
});
