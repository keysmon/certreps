import {it,expect} from "vitest";
import {getIncident,listIncidents} from "./incidents";
import {getCert} from "./certs";
it("provides one reviewed fictional incident per AIP domain with aligned evidence and three decisions",()=>{
 const cases=listIncidents();expect(cases).toHaveLength(5);expect(new Set(cases.map(c=>c.id)).size).toBe(5);expect(cases.map(c=>c.domain)).toEqual(getCert("aip-c01")!.meta.domains.map(d=>d.name));
 for(const item of cases){expect(item.id).toMatch(/^[a-z0-9-]+$/);expect(item.summary).toMatch(/synthetic|fictional/i);expect(item.evidence.length).toBeGreaterThanOrEqual(2);expect(item.steps.map(s=>s.id)).toEqual(["cause","fix","verify"]);expect(item.reviewedOn).toBe("2026-10-18");expect(item.debrief.length).toBeGreaterThan(80);
 for(const step of item.steps){expect(step.correct).toBeGreaterThanOrEqual(0);expect(step.correct).toBeLessThan(step.options.length);expect(step.explanations).toHaveLength(step.options.length);for(const rationale of step.explanations)expect(rationale.length).toBeGreaterThan(35);}
 for(const source of item.sources){const url=new URL(source.url);expect(url.protocol).toBe("https:");expect(["aws.amazon.com","docs.aws.amazon.com"]).toContain(url.hostname);}
 }
 expect(getIncident("__proto__")).toBeUndefined();expect(getIncident("../missing")).toBeUndefined();
});
