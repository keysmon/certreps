import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import audit from "@/content/aip-c01/bank-audit-2026-11-05.json";
import { getBank, getMeta, getPracticeBank } from "./bank";
import { getAnswerNote } from "./learning";
import { sampleMock } from "./sampler";
import { samplePrep } from "./prep";
const bank=getBank(),active=getPracticeBank();
describe("complete remaining AIP bank audit",()=>{
 it("preserves every published historical question contract and prior exclusion",()=>{
  const fields=["id","domain","tag","type","stem","options","correct","explanation","difficulty","docUrl","concept"];
  const old=bank.slice(0,audit.baselineCount).map(q=>Object.fromEntries(fields.filter(f=>Object.hasOwn(q,f)).map(f=>[f,q[f as keyof typeof q]])));
  expect(createHash("sha256").update(JSON.stringify(old)).digest("hex")).toBe(audit.baselineContractsSha256);
  for(const q of audit.priorExclusions)expect(bank.find(x=>x.id===q.id)).toMatchObject(q);
 });
 it("accounts for all 548 remaining items and every exclusion/replacement",()=>{
  expect(audit.reviewed).toHaveLength(548);expect(new Set(audit.reviewed.map(q=>q.id)).size).toBe(548);
  expect(active).toHaveLength(audit.activeCount);
  for(const row of audit.reviewed){
   const original=bank.find(q=>q.id===row.id)!;expect(original).toBeDefined();
   if(row.decision==="retain")expect(original.excludedFromPractice).not.toBe(true);
   else {expect(original.excludedFromPractice).toBe(true);expect(original.exclusionReason).toBeTruthy();}
  }
  for(const row of audit.replacements){
   expect(bank.find(q=>q.id===row.oldId)?.supersededBy).toBe(row.newId);
   expect(active.some(q=>q.id===row.newId)).toBe(true);
  }
 });
 it("gives every new/replacement canonical option notes and dated primary-source evidence",()=>{
  expect(audit.addedIds).toHaveLength(30);
  for(const id of [...audit.addedIds,...audit.replacements.map(q=>q.newId)]){
   const q=active.find(q=>q.id===id)!;expect(q,id).toBeDefined();
   const note=getAnswerNote("aip-c01",id)!;expect(note,id).toBeDefined();expect(note.options).toHaveLength(q.options.length);
   expect(note.options.every(s=>s.trim().length>20)).toBe(true);expect(note.takeaway.length).toBeGreaterThan(20);
   expect(q.explanation).not.toMatch(/<b>[A-E]:<\/b>/);
   const evidence=audit.evidence[id as keyof typeof audit.evidence];expect(evidence.reviewedOn).toBe("2026-11-05");
   expect(evidence.sources.length).toBeGreaterThan(0);for(const url of evidence.sources)expect(new URL(url).hostname).toMatch(/^(docs\.aws\.amazon\.com|aws\.amazon\.com)$/);
  }
 });
 it("retains full mock capacity and 20-question coverage at every difficulty",()=>{
  const meta=getMeta();expect(sampleMock(bank,meta)).toHaveLength(meta.mockQuestionCount);
  for(const level of ["easy","medium","hard"] as const){
   const qs=samplePrep(bank,level,meta);expect(qs).toHaveLength(20);
   expect(qs.every(q=>q.difficulty===level&&!q.excludedFromPractice)).toBe(true);
   expect(meta.domains.map(d=>qs.filter(q=>q.domain===d.name).length)).toEqual([6,5,4,3,2]);
  }
 });
});
