import { test, expect } from "@playwright/test";
import { listCerts } from "../lib/certs";
import { certPath, practicePath } from "../lib/routes";
import { listGuides } from "../lib/guides";

for (const meta of listCerts()) {
  test(`${meta.examCode}: details, domain links and quick practice work`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(certPath(meta));
    await expect(page.getByRole("heading", { name: meta.title, exact: true })).toBeVisible();
    await page.getByRole("button", { name: /pick a specific domain/i }).click();
    for (const domain of meta.domains) {
      await expect(page.getByRole("link", { name: `Drill ${domain.name}`, exact: true })).toHaveAttribute("href", `${practicePath(meta)}?mode=drill&domain=${encodeURIComponent(domain.name)}`);
    }
    await page.getByRole("link", { name: /start practicing/i }).click();
    await expect(page.locator(".qnum")).toHaveText(/Question 1 of \d+/);
    await expect(page.locator("button.option").first()).toBeEnabled();
    expect(errors).toEqual([]);
  });
}

test("anonymous mobile navigation reaches progress and settings without overflow", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/catalog");
  await page.getByRole("button", { name: "Open navigation", exact: true }).click();
  await page.getByRole("navigation", { name: "Mobile workspace navigation" }).getByRole("link", { name: /My progress/ }).click();
  await expect(page.getByRole("heading", { name: "Your progress" })).toBeVisible();
  await expect(page.getByText("No practice yet")).toBeVisible();
  await page.getByRole("button", { name: "Open navigation", exact: true }).click();
  await page.getByRole("navigation", { name: "Mobile workspace navigation" }).getByRole("link", { name: /Settings/ }).click();
  await expect(page.getByRole("heading", { name: "Account & preferences" })).toBeVisible();
  await expect(page.getByRole("radiogroup", { name: "Color theme" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

for (const meta of listCerts()) for (const guide of listGuides(meta.certId)) {
  test(`guide ${meta.certId}/${guide.slug} opens`, async ({ page }) => {
    const response = await page.goto(`/guides/${meta.certId}/${guide.slug}`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
}

test("invalid certification and wrong vendor routes return 404", async ({ page }) => {
  for (const url of ["/aws/not-a-cert", "/gcp/aip-c01", "/guides/aip-c01/not-a-guide"]) {
    expect((await page.goto(url))?.status()).toBe(404);
  }
});
