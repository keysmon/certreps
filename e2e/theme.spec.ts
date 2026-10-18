import { test, expect } from "@playwright/test";

// Saved alternate palettes survive navigation/reload; Industrial is the attribute-less default.
test("theme: pick a non-default theme, persist across a reload, then switch back to default", async ({ page }) => {
  await page.goto("/settings");
  // Default (Industrial): no attribute at all.
  await expect(page.locator("html")).not.toHaveAttribute("data-theme");
  const defaultBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

  // Pick Deep Ocean -> html[data-theme="ocean"], visibly different background, persisted choice.
  await expect(async () => {
    await page.getByRole("radio", { name: "Deep Ocean" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "ocean");
  }).toPass();
  const oceanBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(oceanBg).not.toBe(defaultBg);
  expect(await page.evaluate(() => localStorage.getItem("certreps.theme"))).toBe("ocean");

  // Persists across a navigation and a hard reload (the no-flash script re-applies it from storage).
  await page.goto("/catalog");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "ocean");
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(oceanBg);

  // Signal Gold is preserved as an explicit saved palette, rather than becoming the new default.
  await page.goto("/settings");
  await page.getByRole("radio", { name: "Signal Gold" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "signal");
  const signalBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(signalBg).not.toBe(defaultBg);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "signal");

  // Return to the Industrial default.
  await page.goto("/settings");
  await expect(async () => {
    await page.getByRole("radio", { name: "Industrial" }).click();
    await expect(page.locator("html")).not.toHaveAttribute("data-theme");
  }).toPass();
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(defaultBg);
  expect(await page.evaluate(() => localStorage.getItem("certreps.theme"))).toBe("industrial");
});
