import { createHash } from "node:crypto";
import { describe,it,expect } from "vitest";
import release from "@/content/aip-c01/coverage-release-2026-11-22.json";
import coverage from "@/content/aip-c01/coverage-map.json";
import {getBank,getPracticeBank,getMeta} from "./bank";
import {getAnswerNote,lessonForQuestion,sourceForQuestion} from "./learning";
import {getGuide} from "./guides";
import {sampleMock} from "./sampler";
import {samplePrep} from "./prep";
const all=getBank(),active=getPracticeBank();
describe("AIP breadth release",()=>{
 it("preserves every published record including archive metadata",()=>{
  expect(createHash("sha256").update(JSON.stringify(all.slice(0,release.baselineCount))).digest("hex")).toBe(release.baselineSha256);
  expect(active).toHaveLength(release.activeCount);
 });
 it("adds 86 reviewed originals with aligned rationales and specific optional lessons",()=>{
  expect(release.addedIds).toHaveLength(86);
  for(const id of release.addedIds){
   const q=active.find(q=>q.id===id)!;expect(q,id).toBeDefined();
   const note=getAnswerNote("aip-c01",id)!;expect(note.options).toHaveLength(q.options.length);expect(note.options.every(x=>x.length>30)).toBe(true);
   expect(q.explanation).not.toMatch(/<b>[A-E]:/);
   const evidence=release.evidence[id as keyof typeof release.evidence];expect(evidence.sources.length).toBeGreaterThan(0);
   for(const url of evidence.sources)expect(new URL(url).hostname).toMatch(/^(docs\.aws\.amazon\.com|aws\.amazon\.com)$/);
   expect(evidence.taskRefs.every(ref=>coverage.tasks.some(t=>t.id===ref))).toBe(true);
   expect(lessonForQuestion("aip-c01","aws",q).href).toBe(`/guides/aip-c01/${evidence.lessonSlug}`);
  }
 });
 it("supplies substantive lessons and explicit evidence for all 20 official tasks",()=>{
  expect(coverage.tasks.map(t=>t.id)).toEqual(["1.1","1.2","1.3","1.4","1.5","1.6","2.1","2.2","2.3","2.4","2.5","3.1","3.2","3.3","3.4","4.1","4.2","4.3","5.1","5.2"]);
  for(const task of coverage.tasks){
   expect(task.questionIds.length).toBeGreaterThanOrEqual(2);
   for(const id of task.questionIds)expect(active.some(q=>q.id===id)).toBe(true);
   expect(task.scopeNote.length).toBeGreaterThan(40);
   for(const slug of task.lessonSlugs)expect(getGuide("aip-c01",slug)).not.toBeNull();
  }
  for(const slug of release.lessonSlugs){
   const text=getGuide("aip-c01",slug)!;expect(text.split(/\s+/).length).toBeGreaterThan(450);
   expect(text).toContain("2026-11-22");expect(text).toContain("## Try it");expect(text).toContain("## Check your reasoning");
  }
 });
 it("resolves moved documentation without mutating published records",()=>{
  const q=all.find(q=>q.id==="aipc01-0790")!;
  expect(q.docUrl).toContain("rel_prevent_interaction_failure_idempotent");
  expect(sourceForQuestion(q)).toBe("https://docs.aws.amazon.com/wellarchitected/latest/framework/rel04-bp04.html");
  expect(sourceForQuestion(all[0])).toBe(all[0].docUrl);
 });
 it("preserves balanced mocks and all optional prep levels",()=>{
  const meta=getMeta();expect(sampleMock(all,meta)).toHaveLength(75);
  for(const d of ["easy","medium","hard"] as const){const qs=samplePrep(all,d,meta);expect(qs).toHaveLength(20);expect(qs.every(q=>q.difficulty===d)).toBe(true);}
 });
});
