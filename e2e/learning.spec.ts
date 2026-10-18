import {test,expect} from "@playwright/test";
import {listCerts} from "../lib/certs";
test("all 15 optional curricula and their available guides are reachable",async({page})=>{
 await page.goto("/learn");await expect(page.getByRole("heading",{name:"Learn at your pace."})).toBeVisible();await expect(page.getByRole("link",{name:"Explore curriculum",exact:true})).toHaveCount(15);
 for(const meta of listCerts()){
 await page.goto(`/${meta.vendorSlug}/${meta.certId}/learn`);await expect(page.getByRole("heading",{level:1})).toHaveText(meta.title);await expect(page.locator(".learning-module")).toHaveCount(meta.domains.length);await expect(page.getByRole("link",{name:"Start quick practice",exact:true})).toBeVisible();await expect(page.getByText("Official exam and this practice bank",{exact:true})).toBeVisible();
 const hrefs=await page.locator('.learning-module a[href^="/guides/"]').evaluateAll(links=>links.map(a=>a.getAttribute("href")!));for(const href of hrefs){const response=await page.request.get(href);expect(response.status()).toBe(200);}
 }
 await page.goto("/aws/mla-c01/learn");await expect(page.locator(".learning-notice")).toContainText("legacy MLA-C01");
});
test("learning stays optional and a graded lesson preserves the current practice question",async({page,context})=>{
 await page.goto("/aws/aip-c01/practice?mode=quick");await expect(page.locator(".qstem")).toBeVisible();await expect(page.locator(".lesson-link")).toHaveCount(0);const stem=await page.locator(".qstem").innerText();await page.locator("button.option").first().click();await page.getByRole("button",{name:"Submit answer",exact:true}).click();await expect(page.locator(".lesson-link")).toBeVisible();const popupPromise=context.waitForEvent("page");await page.locator(".lesson-link").click();const popup=await popupPromise;await popup.waitForLoadState();await expect(popup.locator(".guide h1")).toBeVisible();await expect(page.locator(".qstem")).toHaveText(stem);await popup.close();
});
test("timed mock has no lesson or answer hints before final submission",async({page})=>{
 await page.goto("/aws/aip-c01/practice?mode=mock");await page.locator("button.option").first().click();await page.getByRole("button",{name:"Submit answer",exact:true}).click();await expect(page.locator(".answer-learning")).toHaveCount(0);await page.getByRole("button",{name:"Review & submit"}).click();await page.getByRole("button",{name:"Submit exam",exact:true}).click();await page.getByText("Review answers",{exact:true}).click();const firstReview=page.locator(".recap-item").first();if(await firstReview.getAttribute("open")===null)await firstReview.locator("summary").click();await expect(firstReview.locator(".lesson-link")).toBeVisible();
});
