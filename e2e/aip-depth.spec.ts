import { test, expect } from '@playwright/test';
import { getPracticeBank, getMeta } from '../lib/bank';
test('AIP quick practice wires exam-domain quotas into a fresh saved session',async({page})=>{
 await page.goto('/aws/aip-c01/practice?mode=quick');await expect(page.locator('.qstem')).toBeVisible();
 const ids:string[]=await page.evaluate(()=>JSON.parse(localStorage.getItem('certreps.attempts.v1')!)[0].questionIds);
 expect(ids).toHaveLength(10);expect(new Set(ids).size).toBe(10);
 const bank=new Map(getPracticeBank().map(q=>[q.id,q]));
 const counts=getMeta().domains.map(d=>ids.filter(id=>bank.get(id)?.domain===d.name).length);
 expect(counts).toEqual([3,3,2,1,1]);
});
