import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";

const PASSWORD = "e2e-session-only";

test("pass 4 screens", async ({ page }) => {
  test.setTimeout(90_000);
  const width = page.viewportSize()?.width ?? 0;
  const dir = test.info().project.name === "phone-light"
    ? "/opt/cursor/artifacts/os-redesign-pass4/390-light"
    : `/opt/cursor/artifacts/os-redesign-pass4/${width}`;
  mkdirSync(dir, { recursive: true });

  await page.goto("/os/login");
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Enter" }).click();
  await expect(page).toHaveURL(/\/os\/?$/);

  const pages: { path: string; name: string; text: RegExp }[] = [
    { path: "/os", name: "today", text: /waiting on you|You're clear/ },
    { path: "/os/crm", name: "people", text: /I'm in/ },
    { path: "/os/deals", name: "deals", text: /pitches/i },
    { path: "/os/d/fix-dec-1", name: "decision", text: /Approve/ },
    { path: "/os/waiting", name: "waiting", text: /office/i },
    { path: "/os/bots", name: "bots", text: /Needs you/ },
  ];

  for (const item of pages) {
    await page.goto(item.path);
    await page.getByRole("heading", { level: 1 }).waitFor();
    await expect(page.locator("body")).toContainText(item.text);
    await page.screenshot({ path: `${dir}/${item.name}.png` });
  }

  await page.goto("/os");
  const posts = page.getByRole("region", { name: "Posts" });
  await expect(posts).toContainText("Brand check pending");
  await posts.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${dir}/posts.png` });
});
