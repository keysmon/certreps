import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import release from '@/content/aip-c01/depth-release-2026-11-05.json';
import { getBank, getPracticeBank, isResumableAttempt } from './bank';
import { getAnswerNote } from './learning';
import { questionsByIds, sampleQuick } from './sampler';
import { getMeta } from './bank';
import { firstAnswerPerformance } from './first-answers';
import type { Attempt } from './types';
const all=getBank();
describe('AIP depth release historical and learning contracts',()=>{
 it('retains every historical answer/explanation and the prior exclusions',()=>{
  const contracts=all.slice(0,release.baselineCount).map(({id,domain,tag,type,stem,options,correct,explanation,difficulty,docUrl,concept})=>({id,domain,tag,type,stem,options,correct,explanation,difficulty,docUrl,concept}));
  expect(createHash('sha256').update(JSON.stringify(contracts)).digest('hex')).toBe(release.baselineContractsSha256);
  for(const original of release.priorExclusions) expect(all.find(q=>q.id===original.id)).toMatchObject(original);
 });
 it('serves all60 additions and40 replacements while keeping rewritten originals archival',()=>{
  expect(release.addedIds).toHaveLength(60);expect(release.replacements).toHaveLength(40);
  const active=getPracticeBank();
  expect(active.length).toBeGreaterThanOrEqual(100);expect(new Set(all.map(q=>q.id)).size).toBe(all.length);
  for(const row of release.replacements){
   const old=all.find(q=>q.id===row.oldId)!,replacement=all.find(q=>q.id===row.newId)!;
   expect(old.excludedFromPractice).toBe(true);expect(old.supersededBy).toBe(replacement.id);expect(replacement.domain).toBe(old.domain);
   expect(active.some(q=>q.id===old.id)).toBe(false);expect(active.some(q=>q.id===replacement.id)).toBe(true);
  }
  expect(sampleQuick(all,10,undefined,getMeta()).every(q=>!q.excludedFromPractice)).toBe(true);
 });
 it('provides canonical option rationales and primary sources for every new scenario',()=>{
  for(const id of [...release.addedIds,...release.replacements.map(r=>r.newId)]){
   const q=activeQuestion(id),note=getAnswerNote('aip-c01',id)!;
   expect(note).toBeDefined();expect(note.options).toHaveLength(q.options.length);expect(note.takeaway.length).toBeGreaterThan(30);
   for(const text of note.options)expect(text.length).toBeGreaterThan(40);
   const evidence=release.evidence[id as keyof typeof release.evidence];expect(evidence).toBeDefined();expect(evidence.sources.length).toBeGreaterThan(0);
   for(const source of evidence.sources)expect(new URL(source).hostname).toMatch(/^(docs\.aws\.amazon\.com|aws\.amazon\.com)$/);
  }
 });
 it('does not count old answers as fresh mastery of a replacement or resume retired items',()=>{
  const {oldId,newId}=release.replacements[0],old=all.find(q=>q.id===oldId)!;
  const attempt:Attempt={attemptId:'old-run',certId:'aip-c01',mode:'quick',questionIds:[oldId],startedAt:100,finishedAt:200,elapsedSec:1,pauseCount:0,results:{[oldId]:{questionId:oldId,chosen:old.correct,correct:true,flagged:false,answeredAt:150}}};
  expect(questionsByIds(all,[oldId])[0].correct).toEqual(old.correct);
  expect(firstAnswerPerformance([attempt],all,'aip-c01').total).toBe(0);
  expect(isResumableAttempt({...attempt,finishedAt:null},all)).toBe(false);
  expect(firstAnswerPerformance([{...attempt,attemptId:'new-run',questionIds:[newId],results:{[newId]:{questionId:newId,chosen:activeQuestion(newId).correct,correct:true,flagged:false,answeredAt:150}}}],all,'aip-c01').total).toBe(1);
 });
});
function activeQuestion(id:string){const q=getPracticeBank().find(q=>q.id===id);expect(q, id).toBeDefined();return q!;}
