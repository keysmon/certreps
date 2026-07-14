import { test, expect } from "@playwright/test";

// Real-user path: land on the homepage, browse to the catalog, narrow it to one cert via the
// search field (the redesign replaced the vendor facet sidebar with a search + level filter),
// then open a cert detail page and confirm its core content renders - the per-domain rows (behind
// the "pick a specific domain" toggle now) and the full-mock launch.
test("landing -> catalog -> search -> cert detail renders its domain rows and the mock launch", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Browse \d+ certifications/ }).click();
  await expect(page).toHaveURL(/\/catalog$/);

  // The catalog is a search field + level segment + card grid (no vendor facet sidebar, no
  // h1.ct-title). Type the exam name to narrow, then open its card.
  await page.getByRole("searchbox", { name: "Search certifications" }).fill("AWS Certified AI Practitioner");
  await page.getByRole("link", { name: "AWS Certified AI Practitioner", exact: true }).click();
  await expect(page).toHaveURL(/\/aws\/aif-c01$/);

  // Domain rows live behind the progressive-disclosure toggle - expand it, then confirm one row
  // per meta.json domain renders (5 for aif-c01).
  await page.getByRole("button", { name: /pick a specific domain/i }).click();
  await expect(page.locator(".cd-domain")).toHaveCount(5);

  // The full mock is launchable from the detail page (Step 2 of "Your path to ready").
  await expect(page.getByRole("link", { name: /Take the full mock/ })).toBeVisible();

  // Note: the old "What's inside" facts panel (Practice questions / Mock length) and the per-domain
  // study-guide links were removed in the redesign, so those sub-assertions are dropped - the domain
  // rows + mock launch above carry the "cert detail renders its core content" intent.
});
