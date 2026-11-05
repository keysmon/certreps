import { describe, expect, it } from 'vitest';
import { getCurriculum, lessonForQuestion } from './learning';
import { getGuide } from './guides';
const lessons = [
 ['enterprise-identity-federation','federated-access-and-temporary-credentials'],
 ['knowledge-base-ingestion-observability','knowledge-base-ingestion-observability'],
 ['knowledge-base-document-lifecycle','resilient-knowledge-base-synchronization'],
 ['gpu-serving-configuration','gpu-serving-and-batching'],
 ['asynchronous-model-hosting','asynchronous-model-hosting'],
 ['guardrail-diagnostics','guardrail-diagnostics'],
] as const;
describe('AIP implementation lessons',()=>{
 it.each(lessons)('links %s to a substantive optional lesson', (concept,slug)=>{
  expect(lessonForQuestion('aip-c01','aws',{domain:'Implementation & Integration',concept}).href).toBe(`/guides/aip-c01/${slug}`);
  const guide=getGuide('aip-c01',slug);expect(guide).not.toBeNull();expect(guide!.split(/\s+/).length).toBeGreaterThan(200);
  expect(guide).toContain('## Try it');expect(guide).toContain('## Check your reasoning');expect(guide).toContain('https://docs.aws.amazon.com/');
 });
 it('presents official benchmarking and implementation practice without promising an exam pass',()=>{
  const course=getCurriculum('aip-c01')!;expect(course.sources.some(s=>s.url.includes('skillbuilder.aws'))).toBe(true);
  expect(course.overview).toMatch(/practice.*does not|not.*guarantee/i);
 });
});
