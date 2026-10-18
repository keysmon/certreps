import { test, expect } from "@playwright/test";
import { getPracticeBank, getMeta } from "../lib/bank";
import type { Attempt } from "../lib/types";

const domain = getMeta().domains[1].name;
const questions = getPracticeBank().filter(q => q.domain === domain).slice(0, 12);
const source: Attempt = {
  attemptId: "results-source", certId: "aip-c01", mode: "drill", domain,
  questionIds: questions.map(q => q.id),
  results: Object.fromEntries(questions.map((q, i) => [q.id, {
    questionId: q.id, chosen: i === 11 ? [q.options.findIndex((_, j) => !q.correct.includes(j))] : q.correct,
    correct: i !== 11, flagged: false,
  }])),
  startedAt: 1, finishedAt: 2, elapsedSec: 600, pauseCount: 0,
};

for (const width of [1280, 375]) test(`domain result review, navigation and scoped retry at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  // Unrelated older misses must never leak into this result's retry.
  const old = { ...source, attemptId: "older-misses", questionIds: [questions[0].id], results: { [questions[0].id]: { questionId: questions[0].id, chosen: [0], correct: false, flagged: false } } };
  await page.goto("/aws/aip-c01");
  await page.evaluate(attempts => localStorage.setItem("certreps.attempts.v1", JSON.stringify(attempts)), [old, source]);
  await page.goto("/account/attempts/results-source");
  await expect(page.getByText("Domain drill result", { exact: true })).toBeVisible();
  await expect(page.getByText("92%", { exact: true })).toBeVisible();
  await expect(page.getByText("11 / 12 correct", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Suggested practice" })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const caption = await page.getByText("11 / 12 correct", { exact: true }).boundingBox();
  const ring = await page.locator(".result-hero svg").boundingBox();
  expect(caption!.y).toBeGreaterThanOrEqual(ring!.y + ring!.height);
  await page.screenshot({ path: `/tmp/certreps-results-${width}.png`, fullPage: true });
  await page.getByRole("button", { name: "Review 1 missed question", exact: true }).click();
  await expect(page.locator(".recap-item")).toHaveCount(1);
  await expect(page.locator(".recap-explain")).toBeVisible();
  await page.getByRole("button", { name: "Show all 12 answers", exact: true }).click();
  await expect(page.locator(".recap-item")).toHaveCount(12);
  await page.getByRole("link", { name: "Choose another domain", exact: true }).click();
  await expect(page.getByRole("button", { name: /hide domains/i })).toBeVisible();
  await expect(page.getByRole("link", { name: `Drill ${domain}`, exact: true })).toBeVisible();
  await page.goto("/account/attempts/results-source");
  await page.getByRole("link", { name: "Retry 1 missed question", exact: true }).click();
  await expect(page.locator(".qnum")).toHaveText("Question 1 of 1");
  await expect(page.locator(".qstem")).toContainText(questions[11].stem);
  const retry = await page.evaluate(() => JSON.parse(localStorage.getItem("certreps.attempts.v1")!).find((a: Attempt) => a.mode === "retry"));
  expect(retry.questionIds).toEqual([questions[11].id]);
  for (const i of questions[11].correct) await page.locator("button.option").filter({ hasText: questions[11].options[i] }).click();
  await page.getByRole("button", { name: "Submit answer", exact: true }).click();
  await page.getByRole("button", { name: "See results", exact: true }).click();
  await expect(page.getByText("100%", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /retry .* missed/i })).toHaveCount(0);
});
