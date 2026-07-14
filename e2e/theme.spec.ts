import { test, expect } from "@playwright/test";

// Real-user path: the redesign moved theme choice out of the top bar (the .tn-theme toggle is gone)
// into a five-way picker on /settings (Signal Gold / Deep Ocean / Ultraviolet / Graphite / Daylight).
// Signal Gold is the default and carries NO data-theme attribute; the four alternates set
// html[data-theme=<slug>] and persist under localStorage certreps.theme. This preserves the old
// intent: a theme choice applies and survives a navigation + hard reload, and switching back to the
// default clears the attribute. No-flash paint timing stays out of scope (persistence only).
//
// The picker's onClick is a hydrated client handler, so click+assert is wrapped in toPass() - a click
// that lands before hydration is a harmless no-op that simply retries until the attribute sticks.
test("theme: pick a non-default theme, persist across a reload, then switch back to default", async ({ page }) => {
  await page.goto("/settings");
  // Default (Signal Gold): no attribute at all.
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

  // Switch back to Signal Gold (the default) - the attribute clears entirely, storage records "signal".
  await page.goto("/settings");
  await expect(async () => {
    await page.getByRole("radio", { name: "Signal Gold" }).click();
    await expect(page.locator("html")).not.toHaveAttribute("data-theme");
  }).toPass();
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(defaultBg);
  expect(await page.evaluate(() => localStorage.getItem("certreps.theme"))).toBe("signal");
});
