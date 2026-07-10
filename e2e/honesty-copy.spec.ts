import { test, expect } from "@playwright/test";

// Real-user path: certs whose vendor publishes no official passing score must say so
// plainly (a "study target", never an asserted "pass line"); certs with a real published
// pass line must never borrow that "study target" hedge. Both facts are SSR-rendered from
// meta.json's passLineOfficial, so this needs no interaction - just the honest copy.
test("honesty copy: unpublished pass score reads as a study target, official certs make no such claim", async ({
  page,
}) => {
  await page.goto("/nvidia/nca-genl");
  await expect(page.getByText("Pass score")).toBeVisible();
  await expect(page.getByText("Not published - 70% study target")).toBeVisible();

  await page.goto("/aws/aif-c01");
  await expect(page.getByText("Pass score")).toHaveCount(0);
  await expect(page.getByText(/study target/i)).toHaveCount(0);
});
