import { test, expect } from "@playwright/test";
import { getPracticeBank } from "../lib/bank";
import { listIncidents } from "../lib/incidents";

for (const viewport of [{ width: 320, height: 568 }, { width: 375, height: 667 }, { width: 430, height: 740 }, { width: 932, height: 430 }]) {
  test(`iPhone pages and touch controls at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    for (const path of ["/", "/catalog", "/learn", "/aws/aip-c01/learn", "/aws/aip-c01", "/account", "/settings", "/login", "/guides/aip-c01/exam-week-rapid-review"]) {
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
    const submit = page.getByRole("button", { name: "Submit answer", exact: true });
    await expect(submit).toBeInViewport();
    await expect(submit).toBeDisabled();
    const submitBox = await submit.boundingBox();
    expect(submitBox!.y + submitBox!.height).toBeLessThanOrEqual(viewport.height);
    await page.screenshot({ path: `/tmp/certreps-iphone-question-${viewport.width}.png`, fullPage: true });
    const bar = await page.locator(".exambar").boundingBox();
    expect(bar!.height).toBeLessThanOrEqual(60);
    const menuButton = page.getByRole("button", { name: "Open navigation", exact: true });
    expect(await menuButton.evaluate(el => getComputedStyle(el).color)).toBe(await page.locator("body").evaluate(el => getComputedStyle(el).color));
    await expect(page.locator(".tn-bar")).not.toBeVisible();
    await expect(page.locator(".workspace-mobile:not(.practice-menu)")).not.toBeVisible();
    expect((await page.locator(".qstem").boundingBox())!.y).toBeLessThanOrEqual(165);
    await page.getByRole("button", { name: "Open navigation", exact: true }).click();
    const menu = page.getByRole("navigation", { name: "Mobile workspace navigation" });
    await expect(menu.getByRole("link", { name: /Certifications/ })).toBeVisible();
    await expect(menu.getByRole("link", { name: /My progress/ })).toBeVisible();
    await expect(menu.getByRole("link", { name: /Settings/ })).toBeVisible();
    await page.getByRole("button", { name: "Close navigation", exact: true }).click();
    const stem = await page.locator(".qstem").boundingBox();
    const choices = await page.locator(".qcard > .options").boundingBox();
    expect(choices!.y).toBeGreaterThanOrEqual(stem!.y + stem!.height);
    expect((await page.locator(".exit").boundingBox())!.height).toBeGreaterThanOrEqual(44);
    const id = await page.evaluate(() => JSON.parse(localStorage.getItem("certreps.attempts.v1")!)[0].questionIds[0]);
    const q = getPracticeBank().find(q => q.id === id)!;
    for (const i of q.correct) await page.locator("button.option").filter({ hasText: q.options[i] }).click();
    await expect(submit).toBeEnabled();
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(submit).toBeInViewport();
    expect((await submit.boundingBox())!.y).toBeCloseTo(submitBox!.y, 0);
    await page.addStyleTag({ content: ":root { --safe-bottom: 34px; }" });
    expect(await page.locator(".qcard > .footbar").evaluate(el => parseFloat(getComputedStyle(el).paddingBottom))).toBeGreaterThanOrEqual(46);
    await page.screenshot({ path: `/tmp/certreps-iphone-submit-${viewport.width}.png` });
    await submit.click();
    await expect(page.locator(".qcard > .footbar")).toHaveCount(0);
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

for (const viewport of [{ width: 320, height: 568 }, { width: 375, height: 667 }, { width: 430, height: 740 }, { width: 932, height: 430 }]) {
  test(`iPhone mock review and results at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/aws/aip-c01/practice?mode=mock");
    await expect(page.getByRole("timer")).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit answer", exact: true })).toBeInViewport();
    await page.locator("button.option").first().click();
    await page.getByRole("button", { name: "Submit answer", exact: true }).click();
    await expect(page.getByRole("button", { name: "Update answer", exact: true })).toBeInViewport();
    const review = page.getByRole("button", { name: "Review & submit", exact: true });
    expect((await review.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect((await page.locator(".exambar").boundingBox())!.height).toBeLessThanOrEqual(60);
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

test("phone keyboard certification switcher remains visible with compact chrome", async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 740 });
  await page.goto("/aws/aip-c01/practice?mode=quick");
  await expect(page.locator(".qstem")).toBeVisible();
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Open navigation", exact: true })).toBeFocused();
});


test("long service actions wrap in narrow phone answer review", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  const q = getPracticeBank().find(q => JSON.stringify(q).includes("bedrock:InvokeModelWithResponseStream"))!;
  expect(q).toBeDefined();
  await page.goto("/aws/aip-c01");
  await page.evaluate(questionId => localStorage.setItem("certreps.attempts.v1", JSON.stringify([{
    attemptId: "long-service-action", certId: "aip-c01", mode: "quick", questionIds: [questionId],
    results: {}, startedAt: 1, finishedAt: 2, elapsedSec: 60, pauseCount: 0,
  }])), q.id);
  await page.goto("/account/attempts/long-service-action");
  await page.getByRole("button", { name: "Review 1 missed question", exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

for(const viewport of [{width:375,height:667},{width:430,height:740},{width:932,height:430}])test(`optional incident checkpoints fit mobile at ${viewport.width}px`,async({page})=>{
 const incident=listIncidents()[1];await page.setViewportSize(viewport);await page.goto("/aws/aip-c01/incidents");expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.goto(`/aws/aip-c01/incidents/${incident.id}`);await expect(page.locator(".incident-toolbar")).toBeVisible();expect((await page.locator(".incident-toolbar").boundingBox())!.height).toBeLessThanOrEqual(62);
 for(let i=0;i<3;i++){
 const step=incident.steps[i];await page.getByRole("radio").nth(step.correct).click();const check=page.getByRole("button",{name:"Check answer",exact:true});await expect(check).toBeInViewport();expect((await check.boundingBox())!.height).toBeGreaterThanOrEqual(44);await check.click();await expect(page.getByRole("status")).toBeVisible();const next=page.getByRole("button",{name:i===2?"View debrief":"Next checkpoint",exact:true});await expect(next).toBeInViewport();await next.click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);if(i<2){const heading=page.getByRole("heading",{name:incident.steps[i+1].prompt,exact:true});await expect(heading).toBeFocused();await expect(heading).toBeInViewport();}
 }
 await expect(page.getByRole("heading",{name:"Case complete.",exact:true})).toBeVisible();await expect(page.getByRole("button",{name:"Replay this case",exact:true})).toBeVisible();
 const byDomain=new Map(getPracticeBank().map(q=>[q.domain,q]));const questions=[...byDomain.values()];const at=Date.now()-1000;
 const saved={attemptId:"mobile-first-answer-fixture",certId:"aip-c01",mode:"quick",questionIds:questions.map(q=>q.id),results:Object.fromEntries(questions.map(q=>[q.id,{questionId:q.id,chosen:q.correct,correct:true,flagged:false,answeredAt:at+100}])),startedAt:at,finishedAt:at+500,elapsedSec:1,pauseCount:0};
 await page.evaluate(saved=>localStorage.setItem("certreps.attempts.v1",JSON.stringify([saved])),saved);await page.goto("/aws/aip-c01");await expect(page.getByTestId("first-answer-score")).toContainText("5 / 5");await page.getByText("Domain breakdown and how this is counted",{exact:true}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
