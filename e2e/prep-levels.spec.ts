import { test, expect } from "@playwright/test";
import { getPracticeBank, getMeta } from "../lib/bank";
import { chooseFirstAnswer } from "./answer-helpers";
const bank=getPracticeBank();
for(const [level,label] of [["easy","Foundation"],["medium","Standard"],["hard","Challenge"]]){
 test(`${label} prep chooses 20 active questions at one level`,async({page})=>{
  await page.goto(`/aws/aip-c01/practice?mode=quick&level=${level}`);
  await expect(page.getByRole("heading",{name:`${label} prep.`})).toBeVisible();
  const a=await page.evaluate(()=>JSON.parse(localStorage.getItem("certreps.attempts.v1")!)[0]);
  expect(a.questionIds).toHaveLength(20);
  const picked=a.questionIds.map((id:string)=>bank.find(q=>q.id===id)!);
  expect(picked.every((q:{difficulty:string})=>q?.difficulty===level)).toBe(true);
  expect(getMeta().domains.map(d=>picked.filter((q:{domain:string})=>q.domain===d.name).length)).toEqual([6,5,4,3,2]);
  await chooseFirstAnswer(page);await page.getByRole("button",{name:"Submit answer",exact:true}).click();
  await page.getByRole("button",{name:/next question/i}).click();
  await page.goto(`/aws/aip-c01/practice?mode=quick&level=${level}`);
  await expect(page.getByRole("heading",{name:`You have a ${label} prep in progress`})).toBeVisible();
  await page.getByRole("link",{name:"Resume",exact:true}).click();
  await expect(page.locator(".qnum")).toContainText("Question 2 of 20");
  await expect(page.getByRole("heading",{name:`${label} prep.`})).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("certreps.attempts.v1")!).length)).toBe(1);
 });
}
test("difficulty choices are optional and retain balanced quick entry",async({page})=>{
 await page.goto("/aws/aip-c01");
 await expect(page.getByRole("link",{name:/Start practicing/})).toHaveAttribute("href","/aws/aip-c01/practice?mode=quick");
 await page.getByText("Choose a difficulty / 20-question prep",{exact:true}).click();
 await page.getByRole("link",{name:"Challenge / 20 Q",exact:true}).click();
 await expect(page.getByRole("heading",{name:"Challenge prep."})).toBeVisible();
});
