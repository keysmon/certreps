import { test, expect } from "@playwright/test";

// Real-user path through the v1h mock-mode exam navigation: answer a few questions, jump
// back via the numbered palette to edit one, flag an answered AND an unanswered question,
// leave mid-exam through the site nav, come back through the interstitial (not the direct
// "Resume practicing" shortcut, which bypasses it), and confirm the palette/review screen
// reflect the restored state honestly - including that a flag-only row never inflates the
// answered count (the dc5433f regression this suite already pins for practice mode, here
// exercised for mock's review screen instead).
test("exam navigation: palette jump, edit, flag, leave, resume via interstitial, submit", async ({ page }) => {
  await page.goto("/aws/aif-c01");
  await page.getByRole("link", { name: /Take the full mock/ }).click();
  await expect(page).toHaveURL(/mode=mock/);

  // Answer questions 1-3, advancing with the mock nav's "Next" after each submit.
  for (let i = 0; i < 3; i++) {
    await page.locator("button.option").first().click();
    await page.locator("div.footbar button.btn-primary").click(); // Submit answer
    await page.getByRole("button", { name: "Next", exact: true }).click();
  }
  await expect(page.locator(".qnum")).toHaveText("Question 4 of 50");

  // Jump back to question 1 via the numbered palette (reachable through Review & submit).
  await page.getByRole("button", { name: "Review & submit" }).click();
  await page.getByRole("button", { name: "Go to question 1", exact: true }).click();
  await expect(page.locator(".qnum")).toHaveText("Question 1 of 50");

  // The previously-recorded choice pre-fills, so the footbar offers to update it, not submit fresh.
  await expect(page.locator("div.footbar button.btn-primary")).toHaveText("Update answer");

  // Change the answer: deselect option A (no-op if this was a single-select replace, but clears a
  // multi-select's first pick), then select option B, so the recorded choice ends up as exactly
  // option B regardless of question type.
  await page.locator("button.option").nth(0).click();
  await page.locator("button.option").nth(1).click();
  const editedOptionText = await page.locator("button.option").nth(1).locator("span:not(.marker)").innerText();
  await page.locator("div.footbar button.btn-primary").click(); // Update answer

  // Flag the now-edited, answered question 1.
  await page.getByRole("button", { name: "Flag for review" }).click();

  // Move to question 4 (still unanswered) and flag it too.
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: "Next", exact: true }).click();
  }
  await expect(page.locator(".qnum")).toHaveText("Question 4 of 50");
  await page.getByRole("button", { name: "Flag for review" }).click();

  // Leave mid-exam through the engine's Exit affordance. The redesign dropped the persistent
  // "Catalog" nav link, so the exam bar's Exit (back to the cert page) is the in-session way out.
  await page.locator("a.exit").click();
  await expect(page).toHaveURL(/\/aws\/aif-c01$/);

  // Return, and re-enter through the BARE mock URL (not the "Resume practicing" shortcut) so the
  // interstitial actually gates the re-entry.
  await page.goto("/aws/aif-c01");
  await page.getByRole("link", { name: /Take the full mock/ }).click();
  await expect(page.getByRole("heading", { name: "You have a Full Mock in progress" })).toBeVisible();
  await page.getByRole("link", { name: "Resume", exact: true }).click();

  // Restored at the first genuinely-unanswered question (question 4 - a flag-only row must never
  // count as answered here either).
  await expect(page.locator(".qnum")).toHaveText("Question 4 of 50");

  // Open the review screen and verify the restored state honestly.
  await page.getByRole("button", { name: "Review & submit" }).click();
  await expect(page.getByText("3 of 50 answered.")).toBeVisible();
  await expect(page.getByText("47 unanswered - they grade as incorrect.")).toBeVisible();

  // Palette: question 1 (answered + flagged, not current) and question 4 (unanswered + flagged +
  // current) are each distinguishable by their own aria-label, matching ReviewMap's exact wording.
  await expect(page.getByRole("button", { name: "Go to question 1, flagged", exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Go to question 4, unanswered, flagged, current", exact: true }),
  ).toBeVisible();

  // Unanswered/Flagged lists with jump links.
  const reviewLists = page.locator(".review-list");
  await expect(reviewLists.nth(0).getByRole("heading", { name: "Unanswered (47)", exact: true })).toBeVisible();
  await expect(reviewLists.nth(1).getByRole("heading", { name: "Flagged for review (2)", exact: true })).toBeVisible();
  await expect(reviewLists.nth(1).getByRole("button", { name: "Question 1", exact: true })).toBeVisible();
  await expect(reviewLists.nth(1).getByRole("button", { name: "Question 4 (unanswered)", exact: true })).toBeVisible();

  // Submit and confirm Results graded the EDITED answer for question 1, not the original pick.
  // The redesigned Results hero leads with the verdict headline (.r-verdict) under a "Readiness"
  // eyebrow - the old "Readiness read" wording is gone, so anchor on the headline element.
  await page.getByRole("button", { name: "Submit exam" }).click();
  await expect(page.locator("h3.r-verdict")).toBeVisible();
  await expect(page.locator(".recap-item").first()).toContainText(editedOptionText);
});
