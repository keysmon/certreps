import {describe,it,expect} from "vitest";
import fs from "node:fs";
import path from "node:path";
import {listCerts,getCert} from "./certs";
import {getCurriculum,lessonForQuestion,getAnswerNote} from "./learning";
import notes from "@/content/aip-c01/answer-notes.json";
describe("learning content contracts",()=>{
 it("covers every domain of all 15 certs with substantive optional outlines and valid lessons",()=>{
 const certs=listCerts();expect(certs).toHaveLength(15);
 for(const meta of certs){const course=getCurriculum(meta.certId)!;expect(course).toBeDefined();expect(course.modules.map(m=>m.domain)).toEqual(meta.domains.map(d=>d.name));expect(course.prerequisites.length).toBeGreaterThan(0);expect(course.sources.length).toBeGreaterThan(0);for(const source of course.sources) expect(new URL(source.url).protocol).toBe("https:");
 for(const module of course.modules){expect(module.topics.length).toBeGreaterThanOrEqual(3);expect(module.objective.length).toBeGreaterThan(30);expect(module.exercise.length).toBeGreaterThan(50);if(module.guideSlug)expect(fs.existsSync(path.join(process.cwd(),"content",meta.certId,"guides",`${module.guideSlug}.md`))).toBe(true);}
 expect(meta.examDetails?.checkedOn).toBe("2026-10-18");if(meta.vendorSlug==="aws")expect(meta.passLineOfficial).toBe(false);
 }
 expect(getCurriculum("__proto__")).toBeUndefined();
 });
 it("resolves deep links by domain and safely falls back to the curriculum",()=>{
 expect(lessonForQuestion("aip-c01","aws",{domain:"Implementation & Integration"}).href).toBe("/guides/aip-c01/implementation-and-integration");
 expect(lessonForQuestion("aip-c01","aws",{domain:"unknown"}).href).toBe("/aws/aip-c01/learn");
 });
 it("curated notes cover active canonical options across 30 AIP concepts only",()=>{
 const bank=getCert("aip-c01")!.bank;const concepts=new Set<string>();expect(Object.keys(notes)).toHaveLength(30);
 for(const id of Object.keys(notes)){const q=bank.find(q=>q.id===id)!;expect(q).toBeDefined();expect(q.excludedFromPractice).not.toBe(true);const note=getAnswerNote("aip-c01",id)!;expect(note.options).toHaveLength(q.options.length);for(const rationale of note.options)expect(rationale.length).toBeGreaterThan(30);concepts.add(q.concept!);}
 expect(concepts.size).toBe(30);expect(getAnswerNote("nca-genl",Object.keys(notes)[0])).toBeUndefined();expect(getAnswerNote("aip-c01","__proto__")).toBeUndefined();
 });
});
