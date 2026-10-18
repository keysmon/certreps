import { test, expect } from "@playwright/test";

for (const width of [1280, 375]) test(`industrial workspace navigation and page layout at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const path of ["/", "/catalog", "/aws/aip-c01", "/account", "/settings", "/login", "/guides/aip-c01/exam-week-rapid-review"]) {
    await page.goto(path);
    await expect(page.locator("body")).toHaveClass(/industrial-shell/);
    await expect(page.getByRole("link", { name: "CertReps home", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path).toBe(true);
  }
  if (width < 761) {
    await page.getByRole("button", { name: "Open navigation", exact: true }).click();
    const menu = page.getByRole("navigation", { name: "Mobile workspace navigation" });
    await expect(menu).toBeVisible();
    await menu.getByRole("link", { name: /settings/i }).click();
    await expect(page).toHaveURL(/settings$/);
    await expect(page.getByRole("button", { name: "Open navigation" })).toHaveAttribute("aria-expanded", "false");
  } else {
    const rail = page.getByRole("navigation", { name: "Workspace navigation" });
    await expect(rail).toBeVisible();
    await rail.getByRole("link", { name: /my progress/i }).click();
    await expect(page.getByRole("heading", { name: "Your progress", exact: true })).toBeVisible();
    await expect(rail.getByRole("link", { name: /my progress/i })).toHaveAttribute("aria-current", "page");
  }
  expect(errors).toEqual([]);
});
