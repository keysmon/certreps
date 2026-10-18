import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newIncidentRun } from '@/lib/incident-progress';
import { listIncidents } from '@/lib/incidents';
import { GET, POST } from './route';
const mocks = vi.hoisted(() => ({get:vi.fn(),rpc:vi.fn(),select:vi.fn()}));
vi.mock('@/lib/supabase/server',()=>({getSupabaseServer:mocks.get}));
const owner='12345678-1234-4234-8234-123456789012';
const run=()=>newIncidentRun(listIncidents()[0]);
function request(body:unknown) { return new Request('http://test/api/incidents/progress',{method:'POST',body:JSON.stringify(body)}); }
function row(value=run()) { return {incident_id:value.incidentId,run_id:value.runId,content_version:value.contentVersion,answers:value.answers,cursor:value.cursor,draft:value.draft,created_at:value.createdAt,updated_at:value.updatedAt}; }
beforeEach(()=>{vi.clearAllMocks(); mocks.get.mockResolvedValue({auth:{getUser:async()=>({data:{user:{id:owner}},error:null})},rpc:mocks.rpc,from:()=>({select:()=>({eq:mocks.select})})}); mocks.rpc.mockResolvedValue({data:[row()],error:null}); mocks.select.mockResolvedValue({data:[row()],error:null});});
describe('incident progress API',()=>{
 it('denies unauthenticated and switched accounts before writing',async()=>{
  expect((await POST(request({ownerId:crypto.randomUUID(),run:run()}))).status).toBe(409);
  expect(mocks.rpc).not.toHaveBeenCalled();
  mocks.get.mockResolvedValue({auth:{getUser:async()=>({data:{user:null},error:null})}});
  expect((await GET(new Request('http://test/?owner='+owner))).status).toBe(401);
 });
 it('validates JSON shapes, content, prefixes, reset tokens and byte bounds',async()=>{
  for(const body of [null,[],{ownerId:owner,run:{...run(),cursor:3}}, {ownerId:owner,run:{...run(),draft:3}}, {ownerId:owner,run:{...run(),answers:{'0':3}}}, {ownerId:owner,run:{...run(),incidentId:'unknown'}},{ownerId:owner,run:{...run(),contentVersion:'old'}},{ownerId:owner,run:run(),reset:true},{ownerId:owner,run:run(),reset:'yes'}, {ownerId:owner,run:run(),padding:'x'.repeat(20000)}]) expect((await POST(request(body))).status).toBe(400);
  expect(mocks.rpc).not.toHaveBeenCalled();
 });
 it('writes authenticated RPC parameters and returns canonical normalized state without cache',async()=>{
  const input=run(), canonical={...input,answers:{'0':0},cursor:1};
  mocks.rpc.mockResolvedValue({data:[row(canonical)],error:null});
  const response=await POST(request({ownerId:owner,run:input}));
  expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toContain('no-store');
  expect(await response.json()).toEqual({ownerId:owner,run:canonical});
  expect(mocks.rpc).toHaveBeenCalledWith('save_incident_progress',expect.objectContaining({p_incident_id:input.incidentId,p_run_id:input.runId,p_reset:false}));
  expect(mocks.rpc.mock.calls[0][1]).not.toHaveProperty('user_id');
 });
 it('passes explicit replay CAS and returns canonical state on a lost replay race',async()=>{
  const input=run(), previous=crypto.randomUUID(), canonical=run();
  mocks.rpc.mockResolvedValue({data:[row(canonical)],error:null});
  const response=await POST(request({ownerId:owner,run:input,reset:true,expectedRunId:previous}));
  expect((await response.json()).run.runId).toBe(canonical.runId);
  expect(mocks.rpc).toHaveBeenCalledWith('save_incident_progress',expect.objectContaining({p_reset:true,p_expected_run_id:previous}));
 });
 it('rejects malformed JSON and unavailable auth configuration',async()=>{
  expect((await POST(new Request('http://test/',{method:'POST',body:'{'}))).status).toBe(400);
  mocks.get.mockResolvedValue(null);
  expect((await GET(new Request('http://test/?owner='+owner))).status).toBe(503);
 });
 it('returns old content for explicit reset and owner-filtered GET',async()=>{
  mocks.select.mockResolvedValue({data:[{...row(),content_version:'old'}],error:null});
  const response=await GET(new Request('http://test/?owner='+owner));
  expect(response.status).toBe(200);expect((await response.json()).runs[0].contentVersion).toBe('old');
  expect(mocks.select).toHaveBeenCalledWith('user_id',owner);
 });
 it('returns service failures without provider details',async()=>{
  mocks.rpc.mockResolvedValue({data:null,error:{message:'private detail'}});
  const response=await POST(request({ownerId:owner,run:run()}));expect(response.status).toBe(503);expect(await response.text()).not.toContain('private detail');
 });
});
