import {test,expect} from "@playwright/test";
import coverage from "../content/aip-c01/coverage-map.json";
import release from "../content/aip-c01/coverage-release-2026-11-22.json";
import {getPracticeBank} from "../lib/bank";
test("optional coverage map links every official task to substantive learning",async({page})=>{
 await page.goto("/aws/aip-c01/learn");
 await page.getByRole("link",{name:"Explore the exam-task coverage map",exact:true}).click();
 for(const task of coverage.tasks)await expect(page.getByRole("heading",{name:`Task ${task.id}: ${task.title}`,exact:true})).toBeVisible();
 await expect(page.locator('article.guide a[href*="/guides/aip-c01/"]')).not.toHaveCount(0);
 for(const slug of release.lessonSlugs){await page.goto(`/guides/aip-c01/${slug}`);await expect(page.locator("article.guide h1")).toBeVisible();}
});
test("new questions reveal their specific lesson only after grading and keep the saved session",async({page,context})=>{
 const q=getPracticeBank().find(q=>release.addedIds.includes(q.id)&&q.type==="multi")!;
 await page.goto("/aws/aip-c01");
 await page.evaluate(id=>localStorage.setItem("certreps.attempts.v1",JSON.stringify([{attemptId:"coverage-learning",certId:"aip-c01",mode:"quick",questionIds:[id],results:{},startedAt:Date.now(),finishedAt:null,elapsedSec:0,pauseCount:0}])),q.id);
 await page.goto("/aws/aip-c01/practice?mode=quick&resume=coverage-learning");await expect(page.locator(".qstem")).toHaveText(q.stem);
 await expect(page.locator(".answer-learning")).toHaveCount(0);
 for(const i of q.correct)await page.locator("button.option").filter({hasText:q.options[i]}).click();
 await page.getByRole("button",{name:"Submit answer",exact:true}).click();
 const lesson=page.getByRole("link",{name:"Read the implementation lesson (opens new tab)",exact:true});
 const ev=release.evidence[q.id as keyof typeof release.evidence];await expect(lesson).toHaveAttribute("href",`/guides/aip-c01/${ev.lessonSlug}`);
 const popupPromise=context.waitForEvent("page");await lesson.click();const popup=await popupPromise;await expect(popup.locator("article.guide h1")).toBeVisible();await popup.close();
 await expect(page.locator(".qstem")).toHaveText(q.stem);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("certreps.attempts.v1")!)[0].results)).toHaveProperty(q.id);
});
