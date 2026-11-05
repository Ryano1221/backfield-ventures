import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

const PASSWORD = "e2e-session-only";

test("pass 4 screens", async ({ page }) => {
  test.setTimeout(90_000);
  const width = page.viewportSize()?.width ?? 0;
  const project = test.info().project.name;
  const folder = project === "phone-light" ? "390-light" : project === "phone" || project === "phone-dark" ? "390" : String(width);
  test.skip(project === "phone", "phone-dark is the dark 390 run");
  const dir = test.info().outputPath("screens", folder);
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
    { path: "/os/crm/fix-ada", name: "person", text: /Ada/ },
    { path: "/os/deals/pitch_fixture-northwind", name: "pitch", text: /Northwind/ },
    { path: "/os/email", name: "email", text: /Email|Subscribers|subscriber/i },
  ];

  for (const item of pages) {
    await page.goto(item.path);
    await page.getByRole("heading", { level: 1 }).waitFor();
    await expect(page.locator("body")).toContainText(item.text);
    await page.screenshot({ path: path.join(dir, `${item.name}.png`) });
  }

  await page.goto("/os");
  const posts = page.getByRole("region", { name: "Posts and schedule" });
  await expect(posts).toContainText("X");
  await expect(posts).toContainText(/Nov 6/);
  await expect(posts).not.toContainText("brand_pass");
  await expect(posts).not.toContainText("Brand passed");
  await posts.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(dir, "posts.png") });

  const ask = page.locator(".tabbar").getByRole("button", { name: "Ask" });
  if (await ask.count()) await ask.click();
  else await page.locator(".rail-ask").click();
  await expect(page.getByRole("dialog", { name: "Ask the firm" })).toBeVisible();
  await page.screenshot({ path: path.join(dir, "ask.png") });
});
