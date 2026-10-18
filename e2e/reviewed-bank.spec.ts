import { test, expect } from "@playwright/test";
import bank from "../content/aip-c01/questions.json";

const key = "certreps.attempts.v1";
const excluded = new Set(bank.filter((q) => "excludedFromPractice" in q && q.excludedFromPractice).map((q) => q.id));

test("reviewed AIP bank blocks stale resumes and starts a clean 75-question mock", async ({ page }) => {
  await page.goto("/aws/aip-c01");
  await expect(page.getByText(/589 active practice questions/)).toBeVisible();
  const old = { attemptId: "retired-session", certId: "aip-c01", mode: "mock", questionIds: ["aipc01-0001"], results: {}, startedAt: Date.now(), finishedAt: null, elapsedSec: 0, pauseCount: 0 };
  await page.evaluate(({ key, old }) => localStorage.setItem(key, JSON.stringify([old])), { key, old });
  await page.goto("/aws/aip-c01/practice?mode=mock&resume=retired-session");
  await expect(page.getByRole("heading", { name: "This session needs a fresh question set" })).toBeVisible();
  await page.getByRole("link", { name: "Start fresh practice" }).click();
  await expect(page.locator(".qnum")).toHaveText("Question 1 of 75");
  const attempts = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key);
  expect(attempts.find((a: { attemptId: string }) => a.attemptId === old.attemptId)).toEqual(old);
  const fresh = attempts.find((a: { attemptId: string }) => a.attemptId !== old.attemptId);
  expect(fresh.questionIds).toHaveLength(75);
  expect(fresh.questionIds.every((id: string) => !excluded.has(id))).toBe(true);
});
