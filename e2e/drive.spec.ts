import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, rmSync } from "node:fs";

const PASSWORD = "e2e-session-only";

test.describe("drive", () => {
  test.beforeEach(async ({ page }) => {
    rmSync("/tmp/os-actions.json", { force: true });
    rmSync("/tmp/os-decisions.json", { force: true });
    await page.goto("/os/login");
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Enter" }).click();
    await expect(page).toHaveURL(/\/os\/?$/);
  });

  test("walks the end-of-day queue", async ({ page }) => {
    test.setTimeout(180_000);
    const width = page.viewportSize()?.width ?? 0;
    const dir = `/opt/cursor/artifacts/drive/${width}`;
    mkdirSync(dir, { recursive: true });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await expect(page.getByRole("link", { name: /Start Drive/ })).toBeVisible();
    await page.screenshot({ path: `${dir}/today.png` });
    await page.getByRole("link", { name: /Start Drive/ }).click();
    await expect(page.getByRole("heading", { name: "Drive" })).toBeVisible();
    await expect(page.locator(".drive-card")).toBeVisible();
    await page.screenshot({ path: `${dir}/card.png` });

    await findCard(page, "v2");
    await page.getByRole("button", { name: "v1", exact: true }).click();
    await expect(page.getByText(/Only v2, the latest, can be approved/)).toBeVisible();
    await page.screenshot({ path: `${dir}/history.png` });
    await page.getByRole("button", { name: "v2", exact: true }).click();
    await expect(page.locator(".drive-draft mark").first()).toBeVisible();
    await page.screenshot({ path: `${dir}/diff.png` });

    await page.getByRole("button", { name: "Edit" }).click();
    await page.getByLabel("What should change").fill("make it shorter");
    await page.getByRole("button", { name: "Shorter" }).click();
    await page.screenshot({ path: `${dir}/edit.png` });
    await page.getByRole("button", { name: /Make v3/ }).click();
    await expect(page.locator(".drive-pending")).toContainText("Working on v3");

    await findCard(page, "Yes or no");
    await page.screenshot({ path: `${dir}/yesno.png` });
    await page.getByRole("button", { name: "Yes", exact: true }).click();

    await findCard(page, "Rate a deal");
    await page.screenshot({ path: `${dir}/rate.png` });
    await page.locator(".drive-rates").getByRole("button", { name: "great" }).click();

    await page.locator("[data-drive-skip]").first().evaluate((el: HTMLButtonElement) => el.click());
    await page.getByRole("button", { name: /Skipped \(/ }).click();
    await expect(page.getByRole("heading", { name: /Skipped/ })).toBeVisible();
    await page.screenshot({ path: `${dir}/skipped.png` });
    await page.getByRole("button", { name: "Leave for tomorrow" }).click();

    for (let step = 0; step < 20; step += 1) {
      if (await page.getByRole("heading", { name: "All clear" }).isVisible().catch(() => false)) break;
      const pile = page.getByRole("button", { name: /Skipped \(/ });
      const before = await pile.innerText().catch(() => "");
      const clicked = await page.evaluate(() => {
        const button = document.querySelector<HTMLButtonElement>("[data-drive-skip]");
        button?.click();
        return Boolean(button);
      });
      if (clicked) {
        await expect.poll(async () => {
          if (await page.getByRole("heading", { name: "All clear" }).isVisible().catch(() => false)) return "clear";
          return pile.innerText().catch(() => "");
        }).not.toBe(before);
        continue;
      }
      break;
    }
    await expect(page.getByRole("heading", { name: "All clear" })).toBeVisible();
    await page.screenshot({ path: `${dir}/clear.png` });
    expect(errors).toEqual([]);
  });
});

async function findCard(page: Page, text: string) {
  for (let step = 0; step < 20; step += 1) {
    const card = page.locator(".drive-card");
    if (await card.innerText().then((body) => body.toLowerCase().includes(text.toLowerCase())).catch(() => false)) return;
    const next = page.getByRole("button", { name: "Next" });
    if (!(await next.isEnabled().catch(() => false))) break;
    const position = await page.locator(".drive-prog .num").innerText();
    await next.click();
    await expect(page.locator(".drive-prog .num")).not.toHaveText(position);
  }
  throw new Error(`Drive card not found: ${text}`);
}
