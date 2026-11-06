import { describe, expect, it } from "vitest";
import { samplePrep, prepLevel, requestedPrepLevel, PREP_SIZE } from "./prep";
import type { Question } from "./types";
const meta = {domains:[31,26,20,12,11].map((weightPct,i)=>({name:`D${i+1}`,tag:`Domain ${i+1}`,weightPct,mockCount:1}))};
const bank:Question[]=meta.domains.flatMap(d=>["easy","medium","hard"].flatMap(difficulty=>Array.from({length:25},(_,i)=>({id:`${d.name}-${difficulty}-${i}`,domain:d.name,tag:d.tag,type:"single" as const,stem:"A constrained scenario",options:["a","b","c","d"],correct:[0],explanation:"Reason",difficulty:difficulty as Question["difficulty"],docUrl:"https://docs.aws.amazon.com/"}))));
describe("optional AIP prep levels",()=>{
 it.each(["easy","medium","hard"] as const)("samples20 %s items with blueprint coverage and no retired records",level=>{
  const retired={...bank.find(q=>q.difficulty===level)!,id:"retired",excludedFromPractice:true};
  const picked=samplePrep([...bank,retired],level,meta);
  expect(picked).toHaveLength(20);expect(PREP_SIZE).toBe(20);
  expect(new Set(picked.map(q=>q.id)).size).toBe(20);
  expect(picked.every(q=>q.difficulty===level&&!q.excludedFromPractice)).toBe(true);
  expect(meta.domains.map(d=>picked.filter(q=>q.domain===d.name).length)).toEqual([6,5,4,3,2]);
 });
 it("never fills an insufficient level with easier or harder questions",()=>{
  expect(samplePrep(bank.filter(q=>q.difficulty!=="hard"||q.domain==="D1").slice(0,5),"hard",meta)).toEqual([]);
  expect(samplePrep(bank.filter(q=>q.difficulty!=="hard"),"hard",meta)).toEqual([]);
 });
 it("redistributes depleted domains while retaining the requested level",()=>{
  const pool=bank.filter(q=>q.difficulty!=="hard"||q.domain!=="D1"||q.id.endsWith("-0"));
  const picked=samplePrep(pool,"hard",meta);
  expect(picked).toHaveLength(20);expect(picked.filter(q=>q.domain==="D1")).toHaveLength(1);
  expect(picked.every(q=>q.difficulty==="hard")).toBe(true);
 });
 it("recognizes the level from immutable saved questions for resume without new cloud fields",()=>{
  const picked=samplePrep(bank,"hard",meta);
  const attempt={certId:"aip-c01",mode:"quick" as const,questionIds:picked.map(q=>q.id)};
  expect(prepLevel(attempt,bank)).toBe("hard");
  expect(prepLevel({...attempt,mode:"mock"},bank)).toBeUndefined();
  expect(prepLevel({...attempt,certId:"saa-c03"},bank)).toBeUndefined();
  expect(prepLevel({...attempt,questionIds:attempt.questionIds.slice(0,10)},bank)).toBeUndefined();
  expect(prepLevel(attempt,[])).toBeUndefined();
  expect(prepLevel({...attempt,questionIds:[bank.find(q=>q.difficulty==="easy")!.id,...attempt.questionIds.slice(1)]},bank)).toBeUndefined();
 });
 it("accepts levels only for AIP quick sessions",()=>{
  expect(requestedPrepLevel("aip-c01","quick","hard")).toBe("hard");
  expect(requestedPrepLevel("aip-c01","mock","hard")).toBeUndefined();
  expect(requestedPrepLevel("saa-c03","quick","hard")).toBeUndefined();
  expect(requestedPrepLevel("aip-c01","quick","extreme")).toBeUndefined();
 });
});
