import {beforeEach,it,expect,vi} from "vitest";
import {listIncidents} from "./incidents";
import {newIncidentRun} from "./incident-progress";
import {writeIncidentRun,readIncidentRuns,exportIncidentProgress,clearIncidentProgress,flushIncidentRun,pullIncidentProgress,pauseAndDrainIncidentSync,_resetIncidentSync} from "./incident-store";
beforeEach(()=>{localStorage.clear();_resetIncidentSync();vi.unstubAllGlobals();});
it("persists incident choices by owner without mixing guest or other accounts",()=>{
 const run=newIncidentRun(listIncidents()[0]);writeIncidentRun("guest",run);writeIncidentRun("alice",{...run,draft:1});
 expect(readIncidentRuns("guest")[0].draft).toBe(null);expect(readIncidentRuns("alice")[0].draft).toBe(1);expect(readIncidentRuns("bob")).toEqual([]);expect(exportIncidentProgress("alice").map(e=>e.scope)).toEqual(["alice"]);
 localStorage.setItem("certreps.attempts.v1","keep");clearIncidentProgress();expect(readIncidentRuns("alice")).toEqual([]);expect(localStorage.getItem("certreps.attempts.v1")).toBe("keep");
});
it("keeps device progress when cloud save fails",async()=>{
 const run=newIncidentRun(listIncidents()[0]);writeIncidentRun("alice",{...run,draft:2});vi.stubGlobal("fetch",vi.fn().mockRejectedValue(new Error("offline")));
 await expect(flushIncidentRun("alice",run.incidentId)).rejects.toThrow();expect(readIncidentRuns("alice")[0].draft).toBe(2);
});
it("drains issued writes and prevents queued writes during deletion",async()=>{
 const run=newIncidentRun(listIncidents()[0]);writeIncidentRun("alice",run);let release!:(r:Response)=>void;vi.stubGlobal("fetch",vi.fn(()=>new Promise<Response>(resolve=>{release=resolve;})));
 const flush=flushIncidentRun("alice",run.incidentId);await vi.waitFor(()=>expect(fetch).toHaveBeenCalledOnce());let drained=false;const pause=pauseAndDrainIncidentSync().then(()=>{drained=true;});await Promise.resolve();expect(drained).toBe(false);release(new Response(JSON.stringify({ownerId:"alice",run}),{status:200}));await Promise.allSettled([flush,pause]);expect(drained).toBe(true);writeIncidentRun("alice",{...run,draft:1});await expect(flushIncidentRun("alice",run.incidentId)).rejects.toThrow();expect(fetch).toHaveBeenCalledOnce();
});

it("does not let a delayed pre-save pull undo an acknowledged checkpoint or replay",async()=>{
 const run=newIncidentRun(listIncidents()[0]);writeIncidentRun("alice",run);let release!:(r:Response)=>void;
 vi.stubGlobal("fetch",vi.fn((url:string,init?:RequestInit)=>init?.method==="POST"?Promise.resolve(new Response(JSON.stringify({ownerId:"alice",run:JSON.parse(String(init.body)).run}))):new Promise<Response>(resolve=>{release=resolve;})));
 await flushIncidentRun("alice",run.incidentId);const pull=pullIncidentProgress("alice");const next={...run,answers:{"0":1},cursor:1};writeIncidentRun("alice",next);await flushIncidentRun("alice",run.incidentId);release(new Response(JSON.stringify({ownerId:"alice",runs:[run]})));await pull;expect(readIncidentRuns("alice")[0].cursor).toBe(1);
 const old=readIncidentRuns("alice")[0];const delayed=pullIncidentProgress("alice");const replay={...newIncidentRun(listIncidents()[0]),pendingReset:{expectedRunId:old.runId}};writeIncidentRun("alice",replay);await flushIncidentRun("alice",run.incidentId);release(new Response(JSON.stringify({ownerId:"alice",runs:[old]})));await delayed;expect(readIncidentRuns("alice")[0].runId).toBe(replay.runId);
});

it("retargets a second replay when the first replay is acknowledged in flight",async()=>{
 const original=newIncidentRun(listIncidents()[0]);const first={...newIncidentRun(listIncidents()[0]),pendingReset:{expectedRunId:original.runId}};writeIncidentRun("alice",first);
 let release!:(r:Response)=>void;const requests:Record<string,unknown>[]=[];
 vi.stubGlobal("fetch",vi.fn((_url:string,init:RequestInit)=>{const body=JSON.parse(String(init.body));requests.push(body);if(requests.length===1)return new Promise<Response>(resolve=>{release=resolve;});const {pendingReset:_,...run}=body.run;return Promise.resolve(new Response(JSON.stringify({ownerId:"alice",run})));}));
 const flushing=flushIncidentRun("alice",first.incidentId);await vi.waitFor(()=>expect(fetch).toHaveBeenCalledOnce());const second={...newIncidentRun(listIncidents()[0]),pendingReset:{expectedRunId:original.runId}};writeIncidentRun("alice",second);
 const {pendingReset:_,...ack}=first;release(new Response(JSON.stringify({ownerId:"alice",run:ack})));await flushing;
 expect(requests[1].expectedRunId).toBe(first.runId);expect(readIncidentRuns("alice")[0].runId).toBe(second.runId);
});

it("flushes choices and a checkpoint edited while the previous save is in flight",async()=>{
 const run=newIncidentRun(listIncidents()[0]);writeIncidentRun("alice",run);let release!:(r:Response)=>void;const sent:ReturnType<typeof newIncidentRun>[]=[];
 vi.stubGlobal("fetch",vi.fn((_url:string,init:RequestInit)=>{const payload=JSON.parse(String(init.body));sent.push(payload.run);return sent.length===1?new Promise<Response>(resolve=>{release=resolve;}):Promise.resolve(new Response(JSON.stringify({ownerId:"alice",run:payload.run})));}));
 const saving=flushIncidentRun("alice",run.incidentId);await vi.waitFor(()=>expect(fetch).toHaveBeenCalledOnce());writeIncidentRun("alice",{...run,draft:1});writeIncidentRun("alice",{...run,answers:{"0":1},cursor:1,draft:2});release(new Response(JSON.stringify({ownerId:"alice",run})));await saving;
 expect(sent.at(-1)).toMatchObject({answers:{"0":1},cursor:1,draft:2});expect(readIncidentRuns("alice")[0]).toMatchObject({answers:{"0":1},cursor:1,draft:2});
});
