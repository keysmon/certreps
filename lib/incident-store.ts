import {mergeIncidentRuns, parseIncidentRun, type IncidentRun} from "./incident-progress";
const PREFIX = "certreps.incidents.v1.";
const EVENT = "certreps:incidents-changed";
type Entry = {run: IncidentRun; dirty: boolean; revision: number};
const memory = new Map<string, Entry[]>();
const blocked = new Set<string>();
const jobs = new Map<string, Promise<IncidentRun>>();
let paused = false;
let epoch = 0;
const keyFor = (scope: string) => PREFIX + encodeURIComponent(scope);
function entries(scope: string): Entry[] {
  if (typeof window === "undefined") return [];
  if (blocked.has(scope)) return memory.get(scope) ?? [];
  try {
    const value: unknown = JSON.parse(localStorage.getItem(keyFor(scope)) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.flatMap(entry => {
      if (!entry || typeof entry !== "object") return [];
      const run = parseIncidentRun(entry.run);
      return run ? [{run, dirty: entry.dirty === true, revision: Number.isSafeInteger(entry.revision) ? entry.revision : 0}] : [];
    });
  } catch { return memory.get(scope) ?? []; }
}
function persist(scope: string, rows: Entry[]): void {
  memory.set(scope, rows);
  try { localStorage.setItem(keyFor(scope), JSON.stringify(rows)); blocked.delete(scope); }
  catch { blocked.add(scope); }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}
function put(scope: string, run: IncidentRun, dirty: boolean): void {
  const rows = entries(scope);
  const old = rows.find(entry => entry.run.incidentId === run.incidentId);
  persist(scope, [...rows.filter(entry => entry.run.incidentId !== run.incidentId), {run: structuredClone(run), dirty, revision: (old?.revision ?? 0) + 1}]);
}
export function readIncidentRuns(scope: string): IncidentRun[] { return entries(scope).map(entry => structuredClone(entry.run)); }
export function writeIncidentRun(scope: string, run: IncidentRun): void { if (!paused) put(scope, run, scope !== "guest"); }
export function incidentDeviceSaved(scope: string): boolean { return !blocked.has(scope); }
export function incidentNeedsSync(scope: string, id: string): boolean { return entries(scope).some(entry => entry.run.incidentId === id && entry.dirty); }
export function exportIncidentProgress(scope?: string): {scope: string; runs: IncidentRun[]}[] {
  try {
    const scopes = scope ? [scope] : [...new Set([...Object.keys(localStorage).filter(key => key.startsWith(PREFIX)).map(key => decodeURIComponent(key.slice(PREFIX.length))), ...memory.keys()])];
    return scopes.map(scope => ({scope, runs: readIncidentRuns(scope)})).filter(entry => entry.runs.length > 0);
  } catch { return scope ? [{scope, runs: readIncidentRuns(scope)}].filter(entry => entry.runs.length > 0) : []; }
}
export function clearIncidentProgress(): void {
  memory.clear(); blocked.clear();
  try { Object.keys(localStorage).filter(key => key.startsWith(PREFIX)).forEach(key => localStorage.removeItem(key)); } catch { /* Storage may be blocked. */ }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}
function samePosition(a: IncidentRun, b: IncidentRun): boolean {
  return a.runId === b.runId && a.contentVersion === b.contentVersion && a.cursor === b.cursor && a.draft === b.draft && JSON.stringify(a.answers) === JSON.stringify(b.answers) && !a.pendingReset;
}
async function responseJson(response: Response): Promise<Record<string, unknown>> {
  if (!response.ok) throw new Error(response.status === 401 ? "Sign in again to sync this case." : response.status === 409 ? "Your account changed. Reload before saving." : "Account sync is unavailable. Your device copy is kept.");
  return response.json();
}
/** One serial writer per account/case. New local edits are merged after each acknowledged snapshot. */
export function flushIncidentRun(scope: string, id: string): Promise<IncidentRun> {
  if (paused) return Promise.reject(new Error("Incident sync is paused."));
  const key = JSON.stringify([scope, id]);
  const existing = jobs.get(key); if (existing) return existing;
  const generation = epoch;
  const work = (async () => {
    let entry = entries(scope).find(item => item.run.incidentId === id);
    if (!entry) throw new Error("No saved case was found.");
    if (scope === "guest") return entry.run;
    while (entry.dirty) {
      if (paused || generation !== epoch) throw new Error("Incident sync is paused.");
      const sent = entry;
      const response = await fetch("/api/incidents/progress", {method: "POST", headers: {"Content-Type": "application/json"}, credentials: "same-origin", cache: "no-store", body: JSON.stringify({ownerId: scope, run: sent.run.pendingReset ? {...sent.run, answers: {}, cursor: 0, draft: null} : sent.run, reset: !!sent.run.pendingReset, expectedRunId: sent.run.pendingReset?.expectedRunId ?? null})});
      const payload = await responseJson(response);
      if (paused || generation !== epoch) throw new Error("Incident sync is paused.");
      if (payload.ownerId !== scope) throw new Error("Your account changed. Reload before saving.");
      const cloud = parseIncidentRun(payload.run);
      if (!cloud || cloud.incidentId !== id) throw new Error("The saved case response was invalid.");
      const latest = entries(scope).find(item => item.run.incidentId === id);
      if (!latest) throw new Error("This device copy was removed.");
      // A response acknowledges exactly what was sent. Preserve newer local edits,
      // but adopt canonical answers/replays rather than resurrecting an old generation.
      if (sent.run.pendingReset && cloud.runId === sent.run.runId && latest.run.runId !== sent.run.runId && latest.run.pendingReset?.expectedRunId === sent.run.pendingReset.expectedRunId) {
        latest.run.pendingReset = {expectedRunId:cloud.runId};
      }
      const changed = latest.revision !== sent.revision || (!!sent.run.pendingReset && cloud.runId === sent.run.runId);
      const merged = changed ? mergeIncidentRuns(latest.run, cloud) : cloud;
      if (merged.runId === cloud.runId && merged.contentVersion === cloud.contentVersion) delete merged.pendingReset;
      const dirty = changed && !samePosition(merged, cloud);
      put(scope, merged, dirty);
      entry = entries(scope).find(item => item.run.incidentId === id)!;
    }
    return entry.run;
  })();
  jobs.set(key, work);
  void work.finally(() => { if (jobs.get(key) === work) jobs.delete(key); }).catch(() => {});
  return work;
}
/** Pulling never discards dirty answers. A pending replay is sent using its compare-and-set token. */
export async function pullIncidentProgress(scope: string): Promise<IncidentRun[]> {
  if (paused || scope === "guest") return readIncidentRuns(scope);
  const generation = epoch;
  const revisions = new Map(entries(scope).map(entry => [entry.run.incidentId, entry.revision]));
  const response = await fetch(`/api/incidents/progress?owner=${encodeURIComponent(scope)}`, {credentials: "same-origin", cache: "no-store"});
  const payload = await responseJson(response);
  if (paused || generation !== epoch) return readIncidentRuns(scope);
  if (payload.ownerId !== scope || !Array.isArray(payload.runs)) throw new Error("Your account changed. Reload before syncing.");
  for (const value of payload.runs) {
    const cloud = parseIncidentRun(value); if (!cloud) continue;
    const local = entries(scope).find(entry => entry.run.incidentId === cloud.incidentId);
    if (local && local.revision !== revisions.get(cloud.incidentId)) continue;
    const merged = local?.dirty ? mergeIncidentRuns(local.run, cloud) : cloud;
    put(scope, merged, !!local?.dirty && !samePosition(merged, cloud));
  }
  return readIncidentRuns(scope);
}
export async function pauseAndDrainIncidentSync(): Promise<void> { paused = true; epoch++; await Promise.allSettled([...jobs.values()]); }
export function finishIncidentSyncDeletion(): void { /* Remain paused until a successful sign-in. */ }
export function resumeIncidentSyncAfterSignIn(): void { paused = false; epoch++; }
export function _resetIncidentSync(): void { paused = false; epoch++; memory.clear(); blocked.clear(); jobs.clear(); }
