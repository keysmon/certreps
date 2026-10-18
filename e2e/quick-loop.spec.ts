import { test, expect } from "@playwright/test";

// Real-user path: start a quick session on a NON-AWS cert and answer two questions. The
// doc link previously hardcoded "AWS" on every explanation regardless of the cert's actual
// vendor (v1g regression) - this pins the fix by asserting the link names NVIDIA and never AWS.
test("quick loop: answer two questions, see vendor-correct doc links, then exit", async ({ page }) => {
  await page.goto("/nvidia/nca-genl");
  await page.getByRole("link", { name: /Start practicing/ }).click();
  await expect(page).toHaveURL(/\/nvidia\/nca-genl\/practice\?mode=quick/);

  for (let i = 0; i < 2; i++) {
    await page.locator("button.option").first().click();
    await page.locator("div.footbar button.btn-primary").click(); // Submit answer

    const doclink = page.locator(".doclink");
    await expect(doclink).toBeVisible();
    await expect(doclink).toContainText("Read the NVIDIA docs");
    await expect(doclink).not.toContainText("AWS");

    await page.locator(".practice-actionbar button.btn-primary").click(); // Next question
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
    const heading = await page.getByRole("heading", { level: 1 }).boundingBox();
    const bar = await page.locator(".exambar").boundingBox();
    expect(heading!.y).toBeGreaterThanOrEqual(bar!.y + bar!.height);
  }

  await page.locator("a.exit").click();
  await expect(page).toHaveURL(/\/nvidia\/nca-genl$/);
});
