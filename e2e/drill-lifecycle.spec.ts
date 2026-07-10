import { test, expect } from "@playwright/test";

// Real-user path: complete a full 12-question domain drill start to finish. Pins the
// user-reported regression fixed in a6b4145 - finishing a drill (no mock involved) used to
// flip the cert back to "Not started" on the detail readiness panel and the catalog's
// Status facet. "Applications of Foundation Models" carries 14 questions for aif-c01, so a
// 12-question drill samples cleanly with margin.
test("drill lifecycle: finishing a 12-question drill reads In progress everywhere", async ({ page }) => {
  await page.goto("/aws/aif-c01");
  await page.getByRole("link", { name: "Drill Applications of Foundation Models" }).click();
  await expect(page).toHaveURL(/mode=drill&domain=/);

  for (let i = 0; i < 12; i++) {
    await page.locator("button.option").first().click();
    await page.locator("div.footbar button.btn-primary").click(); // Submit answer
    await expect(page.locator(".explain")).toBeVisible();
    await page.locator("div.footbar button.btn-primary").click(); // Next question / See results
  }

  // Results screen shows a readiness read.
  await expect(page.getByText("Readiness read")).toBeVisible();

  // Back on the detail page, the readiness panel reads "In progress" (not "Not started yet").
  await page.goto("/aws/aif-c01");
  await expect(page.getByText("In progress")).toBeVisible();
  await expect(page.getByText("Not started yet")).toHaveCount(0);

  // The catalog's Status facet counts exactly one cert as In progress.
  await page.goto("/catalog");
  const filters = page.getByRole("complementary", { name: "Filters" });
  await expect(filters.getByRole("button", { name: /^In progress/ })).toContainText("1");
});
