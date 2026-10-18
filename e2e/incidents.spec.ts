import {test,expect} from "@playwright/test";
import {listIncidents} from "../lib/incidents";
import {getPracticeBank} from "../lib/bank";
const storageKey="certreps.attempts.v1";
test("incident discovery remains optional and every case can be investigated without exam writes",async({page})=>{
 await page.goto("/aws/aip-c01");await expect(page.getByRole("link",{name:/Start practicing/})).toBeVisible();await page.getByRole("link",{name:"Explore incident challenges",exact:true}).click();await expect(page.getByRole("link",{name:"Investigate case",exact:true})).toHaveCount(5);
 const before=await page.evaluate(key=>localStorage.getItem(key),storageKey);
 for(const incident of listIncidents()){
 await page.goto(`/aws/aip-c01/incidents/${incident.id}`);
 for(let i=0;i<incident.steps.length;i++){
 const step=incident.steps[i];await expect(page.getByRole("heading",{name:step.prompt,exact:true})).toBeVisible();await expect(page.getByRole("button",{name:"Check answer",exact:true})).toBeDisabled();await expect(page.getByRole("status")).toHaveCount(0);await page.getByRole("radio").nth(step.correct).click();await page.getByRole("button",{name:"Check answer",exact:true}).click();await expect(page.getByRole("status")).toContainText(step.explanations[step.correct]);await page.getByRole("button",{name:i===2?"View debrief":"Next checkpoint",exact:true}).click();
 }
 await expect(page.getByRole("heading",{name:"Case complete.",exact:true})).toBeFocused();await expect(page.getByText("3 / 3 checkpoints correct",{exact:true})).toBeVisible();expect(await page.evaluate(key=>localStorage.getItem(key),storageKey)).toBe(before);
 await page.getByRole("button",{name:"Replay this case",exact:true}).click();await expect(page.getByRole("button",{name:"Check answer",exact:true})).toBeDisabled();
 }
 const response=await page.goto("/aws/aip-c01/incidents/unknown-case");expect(response?.status()).toBe(404);
});
test("first-answer performance uses scored history without letting retakes or unfinished timed mocks inflate it",async({page})=>{
 const [q1,q2]=getPracticeBank().slice(0,2);const at=Date.now()-100000;
 const make=(id:string,start:number,correct:boolean,mode="quick",finishedAt:number|null=start+1000)=>({attemptId:id,certId:"aip-c01",mode,questionIds:[q1.id],results:{[q1.id]:{questionId:q1.id,chosen:[0],correct,flagged:false,answeredAt:start+100}},startedAt:start,finishedAt,elapsedSec:1,pauseCount:0});
 await page.goto("/aws/aip-c01");await page.evaluate(({key,attempts})=>localStorage.setItem(key,JSON.stringify(attempts)),{key:storageKey,attempts:[make("first-wrong",at,false),make("retry-correct",at+2000,true),{...make("unfinished-mock",at+4000,true,"mock",null),questionIds:[q2.id],results:{[q2.id]:{questionId:q2.id,chosen:[0],correct:true,flagged:false,answeredAt:at+4100}}}]});await page.reload();await expect(page.getByTestId("first-answer-score")).toContainText("0 / 1");await page.goto("/account");await expect(page.getByTestId("first-answer-score")).toContainText("0 / 1");
});
