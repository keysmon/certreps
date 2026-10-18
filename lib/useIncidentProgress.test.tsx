import {beforeEach,it,expect,vi} from "vitest";
import {renderHook,waitFor,act} from "@testing-library/react";
import {listIncidents} from "./incidents";
import {newIncidentRun} from "./incident-progress";
import {useIncidentProgress} from "./useIncidentProgress";
import {_resetIncidentSync,readIncidentRuns} from "./incident-store";
let owner:string|null=null;
let sessionError:string|null=null;
vi.mock("@/lib/supabase/useSession",()=>({useSession:()=>({session:owner?{user:{id:owner}}:null,loading:false,available:true,error:sessionError})}));
const incident=listIncidents()[0];
beforeEach(()=>{owner=null;sessionError=null;localStorage.clear();_resetIncidentSync();vi.unstubAllGlobals();});
it("keeps a guest draft and checkpoint feedback after reopening",async()=>{
 const first=renderHook(()=>useIncidentProgress(incident));await waitFor(()=>expect(first.result.current.run).not.toBeNull());await act(async()=>{await first.result.current.save({...first.result.current.run!,draft:1});});first.unmount();
 const second=renderHook(()=>useIncidentProgress(incident));await waitFor(()=>expect(second.result.current.run?.draft).toBe(1));expect(second.result.current.status).toBe("device");
});
it("loads a saved account checkpoint independently of device cache",async()=>{
 owner="11111111-1111-4111-8111-111111111111";const saved={...newIncidentRun(incident),answers:{"0":1},cursor:1,draft:2};vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response(JSON.stringify({ownerId:owner,runs:[saved]}))));
 const hook=renderHook(()=>useIncidentProgress(incident));await waitFor(()=>expect(hook.result.current.run?.cursor).toBe(1));expect(hook.result.current.run?.draft).toBe(2);expect(hook.result.current.status).toBe("synced");expect(readIncidentRuns(owner)[0].runId).toBe(saved.runId);
});
it("does not paint a late response from the previous signed-in account",async()=>{
 const a="11111111-1111-4111-8111-111111111111",b="22222222-2222-4222-8222-222222222222";owner=a;let resolveA!:(value:Response)=>void;const runA={...newIncidentRun(incident),answers:{"0":1},cursor:1};const runB={...newIncidentRun(incident),draft:2};vi.stubGlobal("fetch",vi.fn((url:string)=>url.includes(a)?new Promise<Response>(resolve=>{resolveA=resolve;}):Promise.resolve(new Response(JSON.stringify({ownerId:b,runs:[runB]})))));
 const hook=renderHook(()=>useIncidentProgress(incident));await waitFor(()=>expect(fetch).toHaveBeenCalledOnce());owner=b;hook.rerender();await waitFor(()=>expect(hook.result.current.run?.runId).toBe(runB.runId));await act(async()=>{resolveA(new Response(JSON.stringify({ownerId:a,runs:[runA]})));await Promise.resolve();});expect(hook.result.current.run?.runId).toBe(runB.runId);
});

it("preserves the remote generation when replaying more than once offline",async()=>{
 owner="11111111-1111-4111-8111-111111111111";const original=newIncidentRun(incident);
 vi.stubGlobal("fetch",vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ownerId:owner,runs:[original]}))).mockRejectedValue(new Error("offline")));
 const hook=renderHook(()=>useIncidentProgress(incident));await waitFor(()=>expect(hook.result.current.status).toBe("synced"));
 await act(async()=>{await hook.result.current.replay();});const first=hook.result.current.run!;
 await act(async()=>{await hook.result.current.replay();});expect(hook.result.current.run!.runId).not.toBe(first.runId);expect(hook.result.current.run!.pendingReset?.expectedRunId).toBe(original.runId);
});

it("keeps cached account progress available offline",async()=>{
 owner="11111111-1111-4111-8111-111111111111";const saved={...newIncidentRun(incident),answers:{"0":1},cursor:1};
 const {writeIncidentRun}=await import("./incident-store");writeIncidentRun(owner,saved);vi.stubGlobal("fetch",vi.fn().mockRejectedValue(new Error("offline")));
 const hook=renderHook(()=>useIncidentProgress(incident));await waitFor(()=>expect(hook.result.current.status).toBe("error"));expect(hook.result.current.run?.cursor).toBe(1);await act(async()=>{await hook.result.current.save({...saved,draft:2});});expect(hook.result.current.run?.draft).toBe(2);
});
it("does not claim device persistence when storage writes are blocked",async()=>{
 const spy=vi.spyOn(Storage.prototype,"setItem").mockImplementation(()=>{throw new Error("blocked");});try{const hook=renderHook(()=>useIncidentProgress(incident));await waitFor(()=>expect(hook.result.current.status).toBe("error"));expect(hook.result.current.message).toMatch(/storage is unavailable/);expect(hook.result.current.run).not.toBeNull();hook.unmount();}finally{spy.mockRestore();}
});

it("does not expose or edit a guest case while account identity lookup has failed",async()=>{
 const {writeIncidentRun}=await import("./incident-store");const guest={...newIncidentRun(incident),draft:1};writeIncidentRun("guest",guest);sessionError="Account lookup failed. Reload to retry.";
 const hook=renderHook(()=>useIncidentProgress(incident));expect(hook.result.current.run).toBeNull();expect(hook.result.current.status).toBe("error");await act(async()=>{expect(await hook.result.current.save({...guest,draft:2})).toBe(false);});expect(readIncidentRuns("guest")[0].draft).toBe(1);
});
