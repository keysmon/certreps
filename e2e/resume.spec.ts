import { test, expect } from "@playwright/test";

const STORAGE_KEY = "certreps.attempts.v1";

interface StoredAttempt {
  attemptId: string;
  mode: string;
}

async function readAttempts(page: import("@playwright/test").Page): Promise<StoredAttempt[]> {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  }, STORAGE_KEY);
}

// Real-user path: leave a session mid-way, come back, resume it, hit the same URL bare
// (no ?resume) to see the interstitial, then discard through its two-step confirm. A
// second, unrelated in-progress attempt (a quick session on the same cert) is kept
// running throughout so the discard assertion actually proves selectivity - that
// discardAttempt removes ONLY the one row, not the whole store.
test("resume: leave mid-drill, resume it, then discard removes only that attempt", async ({ page }) => {
  await page.goto("/aws/aif-c01");

  // An unrelated in-progress attempt on the same cert, started first (so it is the OLDER
  // of the two and ends up in HeroCtas' "extras" list once the drill below is newer).
  await page.getByRole("link", { name: /Start practicing/ }).click();
  await page.locator("button.option").first().click();
  await page.locator("div.footbar button.btn-primary").click();
  await page.goto("/aws/aif-c01");

  // Start the domain drill, answer 2 of 12, then navigate away without finishing.
  await page.getByRole("link", { name: "Drill Applications of Foundation Models" }).click();
  await expect(page).toHaveURL(/mode=drill&domain=/); // wait for the navigation to land before reading it
  const drillUrl = page.url();
  for (let i = 0; i < 2; i++) {
    await page.locator("button.option").first().click();
    await page.locator("div.footbar button.btn-primary").click();
    await page.locator(".practicenav button.btn-primary").click();
  }
  await page.goto("/aws/aif-c01");

  const beforeDiscard = await readAttempts(page);
  expect(beforeDiscard).toHaveLength(2);
  const quickId = beforeDiscard.find((a) => a.mode === "quick")!.attemptId;
  const drillId = beforeDiscard.find((a) => a.mode === "drill")!.attemptId;

  // The resume affordance on the detail page names the newer (drill) attempt's progress.
  await expect(page.getByText(/Domain Drill in progress/)).toContainText("2 of 12");

  // Resume it - restored at question 3 (2 answered, 0-indexed position 2).
  await page.getByRole("link", { name: /Resume practicing/ }).click();
  await expect(page.locator(".qnum")).toHaveText("Question 3 of 12");

  // Re-enter the same bare drill URL (no ?resume) - the interstitial gates a fresh mount.
  await page.goto(drillUrl);
  await expect(page.getByRole("heading", { name: /You have a Domain Drill in progress/ })).toBeVisible();

  // Two-step discard: the bare "Discard" button reveals a confirm pair, no blocking dialog.
  // The confirm button's aria-label ("Discard this Domain Drill in progress") overrides its
  // visible "Discard it" text as the accessible name, so match on the aria-label.
  await page.getByRole("button", { name: "Discard", exact: true }).click();
  await page.getByRole("button", { name: "Discard this Domain Drill in progress" }).click();

  // Discarding falls through to a fresh engine mount, which creates its own new attempt -
  // so the assertion is membership, not raw count: the quick attempt is untouched, the
  // discarded drill attempt's specific id is gone, and exactly one new drill row replaces it.
  await expect(page.locator(".qnum")).toHaveText("Question 1 of 12");
  const afterDiscard = await readAttempts(page);
  const ids = afterDiscard.map((a) => a.attemptId);
  expect(ids).toContain(quickId);
  expect(ids).not.toContain(drillId);
  expect(afterDiscard).toHaveLength(2);
});
