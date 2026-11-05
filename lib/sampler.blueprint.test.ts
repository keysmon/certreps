import { describe, expect, it, vi } from 'vitest';
import { sampleQuick } from './sampler';
import type { CertMeta, Question } from './types';
function make(domain:string,count:number):Question[]{return Array.from({length:count},(_,i)=>({id:`${domain}-${i}`,domain,tag:domain,type:'single',stem:'A scenario',options:['a','b','c','d'],correct:[0],explanation:'because',difficulty: i%3===0?'easy':i%3===1?'medium':'hard',docUrl:'https://docs.aws.amazon.com/bedrock/'}));}
const domains=[31,26,20,12,11].map((weightPct,i)=>({name:`D${i+1}`,tag:`Domain ${i+1}`,weightPct,mockCount:1}));
const meta={domains} as CertMeta;
const countByDomain=(qs:Question[])=>Object.fromEntries(domains.map(d=>[d.name,qs.filter(q=>q.domain===d.name).length]));
describe('blueprint-balanced quick practice',()=>{
 it('uses 3/3/2/1/1 for ten questions despite a heavily skewed pool',()=>{
  const bank=domains.flatMap((d,i)=>make(d.name,i<2?30:150));
  const picked=sampleQuick(bank,10,undefined,meta);
  expect(picked).toHaveLength(10);expect(new Set(picked.map(q=>q.id)).size).toBe(10);
  expect(countByDomain(picked)).toEqual({D1:3,D2:3,D3:2,D4:1,D5:1});
 });
 it('backfills depleted domains using remaining active questions without duplicate or retired IDs',()=>{
  const bank=[...make('D1',1),...make('D2',3),...make('D3',3),...make('D4',3),...make('D5',3),...make('D1-retired',5).map(q=>({...q,domain:'D1',excludedFromPractice:true}))];
  const picked=sampleQuick(bank,10,undefined,meta);
  expect(picked).toHaveLength(10);expect(new Set(picked.map(q=>q.id)).size).toBe(10);
  expect(picked.filter(q=>q.domain==='D1')).toHaveLength(1);expect(picked.every(q=>!q.excludedFromPractice)).toBe(true);
 });
 it('handles empty, undersized and unmatched pools without inventing slots',()=>{
  expect(sampleQuick([],10,undefined,meta)).toEqual([]);
  const bank=make('unlisted',3);expect(sampleQuick(bank,10,undefined,meta)).toHaveLength(3);
  expect(sampleQuick(bank,0,undefined,meta)).toEqual([]);
  expect(sampleQuick(bank,-3,undefined,meta)).toEqual([]);
 });
 it('retains adaptive preference inside domain quotas',()=>{
  const bank=domains.flatMap(d=>make(d.name,20).map(q=>({...q,difficulty:'medium' as const})));
  const weights=new Map(bank.map(q=>[q.id,q.id==='D1-19'?1000:.001]));
  const random=vi.spyOn(Math,'random').mockReturnValue(.5);
  try { const picked=sampleQuick(bank,10,weights,meta);expect(picked.some(q=>q.id==='D1-19')).toBe(true);expect(countByDomain(picked)).toEqual({D1:3,D2:3,D3:2,D4:1,D5:1}); } finally {random.mockRestore();}
 });
});
