import { describe, expect, it } from 'vitest';
import { listIncidents } from './incidents';
import { incidentVersion, newIncidentRun, validateIncidentRun, mergeIncidentRuns, incidentRunFromRow, parseIncidentRun } from './incident-progress';
const incident = listIncidents()[0];
describe('incident progress model', () => {
 it('creates a valid empty run and fingerprints actual content independently of review date', () => {
  const run = newIncidentRun(incident);
  expect(validateIncidentRun(run, incident)).toEqual(run);
  expect(incidentVersion({...incident, reviewedOn:'tomorrow'})).toBe(run.contentVersion);
  expect(incidentVersion({...incident, steps:incident.steps.map((step,i)=> i ? step : {...step,correct:(step.correct+1)%step.options.length})})).not.toBe(run.contentVersion);
 });
 it('invalidates saved answers when diagnostic evidence labels or bodies change', () => {
  const run = {...newIncidentRun(incident),answers:{'0':0},cursor:1};
  for (const change of [{label: 'Updated artifact'}, {body: 'Updated diagnostic evidence'}]) {
   const changed = {...incident,evidence:incident.evidence.map((item,i)=>i ? item : {...item,...change})};
   expect(incidentVersion(changed)).not.toBe(run.contentVersion);
   expect(validateIncidentRun(run,changed)).toBeNull();
  }
 });
 it('rejects gaps, malformed keys, out of range choices, incompatible versions and cursor contradictions', () => {
  const run = newIncidentRun(incident);
  for (const invalid of [{answers:{'1':0}}, {answers:{'00':0}}, {answers:{'0':4}}, {cursor:2}, {cursor:3,answers:{'0':0,'1':0}}, {contentVersion:'old'}, {draft:4}, {runId:'bad'}]) expect(validateIncidentRun({...run,...invalid},incident)).toBeNull();
 });
 it('accepts checked feedback cursor and complete debrief, rejecting drafts on checked steps', () => {
  const run = newIncidentRun(incident);
  expect(validateIncidentRun({...run,answers:{'0':0},cursor:0},incident)).not.toBeNull();
  expect(validateIncidentRun({...run,answers:{'0':0},cursor:0,draft:1},incident)).toBeNull();
  expect(validateIncidentRun({...run,answers:{'0':0,'1':0,'2':0},cursor:3},incident)).not.toBeNull();
 });
 it('merges committed answers with cloud priority without rewinding and discards invalid draft', () => {
  const base = newIncidentRun(incident);
  const local = {...base,answers:{'0':1,'1':0},cursor:2,draft:1};
  const cloud = {...base,answers:{'0':0,'1':1,'2':0},cursor:3,draft:null};
  expect(mergeIncidentRuns(local,cloud)).toMatchObject({answers:cloud.answers,cursor:3,draft:null});
  expect(mergeIncidentRuns(local,{...cloud,runId:crypto.randomUUID()})).toMatchObject({runId:expect.not.stringMatching(base.runId)});
 });
 it('normalizes cached old content and strips unrelated fields while retaining replay intent', () => {
  const run = {...newIncidentRun(incident),contentVersion:'old',pendingReset:{expectedRunId:null}};
  expect(parseIncidentRun({...run,user_id:'untrusted'})).toEqual(run);
  expect(parseIncidentRun({...run,answers:{'3':0}})).toBeNull();
 });
 it('transports old-version rows without interpreting their answers as current content', () => {
  const run = newIncidentRun(incident);
  expect(incidentRunFromRow({incident_id:run.incidentId,run_id:run.runId,content_version:'old',answers:{},cursor:0,draft:null,created_at:run.createdAt,updated_at:run.updatedAt})).toMatchObject({contentVersion:'old'});
 });
});
