import { test, expect } from "@playwright/test";
import { getPracticeBank } from "../lib/bank";

for (const viewport of [{ width: 430, height: 740 }, { width: 932, height: 430 }]) {
  test(`iPhone pages and touch controls at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    for (const path of ["/", "/catalog", "/aws/aip-c01", "/account", "/settings", "/login", "/guides/aip-c01/exam-week-rapid-review"]) {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path).toBe(true);
      await expect(page.locator('meta[name="viewport"]')).toHaveAttribute("content", /viewport-fit=cover/);
      if (path === "/login") {
        // CI deliberately omits the account backend, so the real login form is unavailable.
        // Measure its input styling using a CSS fixture on the actual route (all route CSS loaded).
        await page.locator(".li-page").evaluate(el => {
          const fixture = document.createElement("div");
          fixture.className = "li-form";
          const input = document.createElement("input");
          input.type = "email";
          fixture.append(input);
          el.append(fixture);
        });
        const fields = page.locator(".li-form input");
        await expect(fields).toHaveCount(1);
        for (const field of await fields.all()) expect(await field.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
      }
      if (path === "/settings") {
        for (const toggle of await page.getByRole("switch").all()) expect((await toggle.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      }
      const menu = page.getByRole("button", { name: "Open navigation", exact: true });
      await expect(menu).toBeVisible();
      expect((await menu.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await page.getByRole("button", { name: "Open navigation", exact: true }).click();
    const menu = page.getByRole("navigation", { name: "Mobile workspace navigation" });
    await menu.getByRole("link", { name: /settings/i }).click();
    await expect(page).toHaveURL(/settings$/);
  });

  test(`iPhone practice has safe controls and resets scroll at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/aws/aip-c01/practice?mode=quick");
    await expect(page.locator("button.option").first()).toBeVisible();
    await page.screenshot({ path: `/tmp/certreps-iphone-question-${viewport.width}.png`, fullPage: true });
    const bar = await page.locator(".exambar").boundingBox();
    expect(bar!.height).toBeLessThanOrEqual(100);
    const stem = await page.locator(".qstem").boundingBox();
    const choices = await page.locator(".qcard > .options").boundingBox();
    expect(choices!.y).toBeGreaterThanOrEqual(stem!.y + stem!.height);
    expect((await page.locator(".exit").boundingBox())!.height).toBeGreaterThanOrEqual(44);
    const id = await page.evaluate(() => JSON.parse(localStorage.getItem("certreps.attempts.v1")!)[0].questionIds[0]);
    const q = getPracticeBank().find(q => q.id === id)!;
    for (const i of q.correct) await page.locator("button.option").filter({ hasText: q.options[i] }).click();
    await page.getByRole("button", { name: "Submit answer", exact: true }).click();
    await page.addStyleTag({ content: ":root { --safe-bottom: 34px; }" });
    const action = page.getByRole("button", { name: "Next question", exact: true });
    expect((await action.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect(await page.locator(".practice-actionbar-inner").evaluate(el => parseFloat(getComputedStyle(el).paddingBottom))).toBeGreaterThanOrEqual(46);
    await page.screenshot({ path: `/tmp/certreps-iphone-feedback-${viewport.width}.png` });
    await action.click();
    await expect(page.locator(".qnum")).toHaveText("Question 2 of 10");
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeFocused();
    const rect = await heading.boundingBox();
    const sticky = await page.locator(".exambar").boundingBox();
    expect(rect!.y).toBeGreaterThanOrEqual(sticky!.y + sticky!.height);
    expect(rect!.y + rect!.height).toBeLessThan(viewport.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

for (const viewport of [{ width: 430, height: 740 }, { width: 932, height: 430 }]) {
  test(`iPhone mock review and results at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/aws/aip-c01/practice?mode=mock");
    await expect(page.getByRole("timer")).toBeVisible();
    const review = page.getByRole("button", { name: "Review & submit", exact: true });
    expect((await review.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect((await page.locator(".exambar").boundingBox())!.height).toBeLessThanOrEqual(112);
    await review.click();
    const jump = page.getByRole("button", { name: /Go to question 2, unanswered/, exact: false });
    expect((await jump.boundingBox())!.width).toBeGreaterThanOrEqual(44);
    await jump.click();
    await expect(page.locator(".qnum")).toHaveText(/Question 2 of/);
    await review.click();
    await page.getByRole("button", { name: "Submit exam", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Session complete.", exact: true })).toBeVisible();
    const actions = page.locator(".result-actions .btn");
    for (const action of await actions.all()) {
      const box = await action.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(48);
      expect(box!.x).toBeGreaterThanOrEqual(20);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width - 20);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `/tmp/certreps-iphone-results-${viewport.width}.png`, fullPage: true });
    await page.getByRole("button", { name: /Review .* missed questions/ }).click();
    await expect(page.locator(".recap-item")).not.toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
