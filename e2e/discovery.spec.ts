import { test, expect } from "@playwright/test";

// Real-user path: land on the homepage, browse to the catalog, narrow it to one vendor
// via a facet chip, then open a cert detail page and confirm its core content renders -
// domain rows, the fact-row panel, and a live (200) study-guide link.
test("landing -> catalog -> filter by vendor -> cert detail renders domains, facts, and a live study guide", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Browse \d+ certifications/ }).click();
  await expect(page).toHaveURL(/\/catalog$/);

  const filters = page.getByRole("complementary", { name: "Filters" });
  await filters.getByRole("button", { name: /^AWS/ }).click();
  await expect(page.locator("h1.ct-title")).toHaveText("AWS");

  await page.getByRole("link", { name: "AWS Certified AI Practitioner" }).click();
  await expect(page).toHaveURL(/\/aws\/aif-c01$/);

  // Domains render - one row per meta.json domain.
  await expect(page.locator(".cd-domain")).toHaveCount(5);

  // Fact rows (the "What's inside" panel) render.
  await expect(page.getByText("Practice questions")).toBeVisible();
  await expect(page.getByText("Mock length")).toBeVisible();

  // The study guide link resolves (200), not just renders.
  const guideLink = page.getByRole("link", { name: "Applications of Foundation Models on AWS (AIF-C01 Domain 3)" });
  await expect(guideLink).toBeVisible();
  const href = await guideLink.getAttribute("href");
  const resp = await page.request.get(href!);
  expect(resp.status()).toBe(200);
});
