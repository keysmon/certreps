import { test, expect } from "@playwright/test";

// Real-user path: certs whose vendor publishes no official passing score must say so plainly (a
// "study target", never an asserted "pass line"); certs with a real published pass line must never
// borrow that "study target" hedge. The redesign removed the always-on "Pass score" fact row from
// the cert page; the official-vs-unofficial distinction now renders in the Results verdict subcopy
// (.r-sub) after a finished mock ("Pass line is ~N%." vs "Study target is N%."). So we drive the
// shortest finished mock - launch, Review & submit, Submit exam - and read the honest copy there.
// The subcopy wording depends only on passLineOfficial, not on the (unanswered = 0%) score, so no
// questions need answering. Negative assertions are scoped to .r-sub: the collapsed per-question
// recap could legitimately contain either phrase, and only the verdict subcopy is the honest claim.

async function submitEmptyMock(page: import("@playwright/test").Page, certPath: string) {
  await page.goto(certPath);
  await page.getByRole("link", { name: /Take the full mock/ }).click();
  await expect(page).toHaveURL(/mode=mock/);
  await page.getByRole("button", { name: "Review & submit" }).click();
  await page.getByRole("button", { name: "Submit exam" }).click();
  await expect(page.locator("h3.r-verdict")).toBeVisible();
}

test("honesty copy: unpublished pass score reads as a study target, official certs make no such claim", async ({
  page,
}) => {
  // NVIDIA NCA-GENL publishes no official pass line -> "study target", never "pass line".
  await submitEmptyMock(page, "/nvidia/nca-genl");
  await expect(page.locator(".r-sub")).toContainText("Study target is 70%.");
  await expect(page.locator(".r-sub")).not.toContainText(/pass line/i);

  // AWS AIF-C01 has a real published pass line -> "pass line", never the "study target" hedge.
  await submitEmptyMock(page, "/aws/aif-c01");
  await expect(page.locator(".r-sub")).toContainText("Pass line is ~70%.");
  await expect(page.locator(".r-sub")).not.toContainText(/study target/i);
});


test("AIP-C01 mock uses 75 questions, 180 minutes, and an independent study target", async ({ page }) => {
  await page.goto("/aws/aip-c01");
  await expect(page.getByText(/The AWS exam has 75 questions in 180 minutes/)).toBeVisible();
  await page.getByRole("link", { name: /Take the full mock/ }).click();
  await expect(page.locator(".qnum")).toHaveText("Question 1 of 75");
  await expect(page.getByRole("timer")).toHaveText(/^(3:00:00|2:59:\d{2})$/);
  await page.getByRole("button", { name: "Review & submit" }).click();
  await expect(page.getByRole("button", { name: /^Go to question \d+/ })).toHaveCount(75);
  await page.getByRole("button", { name: "Submit exam" }).click();
  await expect(page.locator(".r-sub")).toContainText("Study target is 75%.");
  await expect(page.locator(".r-sub")).toContainText("does not convert to AWS's 750/1000 scaled passing score");
  await expect(page.locator(".r-sub")).not.toContainText(/ready to book|pass line/i);
});
