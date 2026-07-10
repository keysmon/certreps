import { test, expect } from "@playwright/test";

// Real-user path: dark is the product default (no data-theme attribute at all); toggling in
// TopNav sets html[data-theme="light"] and visibly changes the page background; the choice
// survives a navigation + hard reload (localStorage certreps.theme); toggling back returns to
// dark. No-flash-on-reload is explicitly out of scope (timing-flaky in CI) - this only checks
// persistence, not paint timing.
test("theme: toggle to light persists across a reload, then back to dark", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme");
  const darkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

  await page.locator(".tn-theme").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const lightBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(lightBg).not.toBe(darkBg);
  expect(await page.evaluate(() => localStorage.getItem("certreps.theme"))).toBe("light");

  // Persists across a navigation and a hard reload.
  await page.goto("/catalog");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(lightBg);

  // Toggle back to dark: the attribute clears entirely (dark carries none, by design).
  await page.locator(".tn-theme").click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme");
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(darkBg);
  expect(await page.evaluate(() => localStorage.getItem("certreps.theme"))).toBe("dark");
});
