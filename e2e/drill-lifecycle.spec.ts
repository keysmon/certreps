import { test, expect } from "@playwright/test";

// Real-user path: complete a full 12-question domain drill start to finish. Pins the
// user-reported regression fixed in a6b4145 - finishing a drill (no mock involved) used to
// flip the cert back to "Not started" on the detail readiness panel and the catalog's
// Status facet. "Applications of Foundation Models" carries 14 questions for aif-c01, so a
// 12-question drill samples cleanly with margin.
test("drill lifecycle: finishing a 12-question drill reads In progress everywhere", async ({ page }) => {
  await page.goto("/aws/aif-c01");
  // The per-domain drill links now sit behind a progressive-disclosure toggle - expand it first.
  await page.getByRole("button", { name: /pick a specific domain/i }).click();
  await page.getByRole("link", { name: "Drill Applications of Foundation Models" }).click();
  await expect(page).toHaveURL(/mode=drill&domain=/);

  for (let i = 0; i < 12; i++) {
    await page.locator("button.option").first().click();
    await page.locator("div.footbar button.btn-primary").click(); // Submit answer
    await expect(page.locator(".explain")).toBeVisible();
    await page.locator(".practice-actionbar button.btn-primary").click(); // Next question / See results
  }

  // Results screen rendered (its verdict headline is the stable marker).
  await expect(page.locator("h3.r-verdict")).toBeVisible();

  // Back on the detail page, the readiness panel reads "In progress" (not "Not started yet").
  // This is the core regression: a finished drill must NOT flip the cert back to "Not started".
  await page.goto("/aws/aif-c01");
  await expect(page.locator(".cd-ready-label")).toHaveText("In progress");
  await expect(page.getByText("Not started yet")).toHaveCount(0);

  // Note: the redesigned catalog dropped the Status facet, and its per-card progress reflects
  // best-mock score only (a drill never moves it), so there is no drill-driven catalog status to
  // assert here - the cert-detail "In progress" check above carries the regression intent.
});
