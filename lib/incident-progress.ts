import type { Incident } from './incidents';

export interface IncidentRun {
  incidentId: string;
  runId: string;
  contentVersion: string;
  answers: Record<string, number>;
  cursor: number;
  draft: number | null;
  createdAt: string;
  updatedAt: string;
  pendingReset?: { expectedRunId: string | null };
}
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
export function incidentVersion(incident: Incident): string {
  const content = JSON.stringify([
    incident.evidence.map(item => [item.label, item.body]),
    incident.steps.map(step => [step.id, step.prompt, step.options, step.correct, step.explanations]),
  ]);
  let first = 2166136261, second = 5381;
  for (let i = 0; i < content.length; i++) {
    first = Math.imul(first ^ content.charCodeAt(i), 16777619);
    second = Math.imul(second, 33) ^ content.charCodeAt(i);
  }
  return `v1-${(first >>> 0).toString(16)}-${(second >>> 0).toString(16)}`;
}
export function newIncidentRun(incident: Incident): IncidentRun {
  const now = new Date().toISOString();
  return { incidentId: incident.id, runId: crypto.randomUUID(), contentVersion: incidentVersion(incident), answers: {}, cursor: 0, draft: null, createdAt: now, updatedAt: now };
}
function object(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function validShape(value: unknown): value is IncidentRun {
  if (!object(value) || typeof value.incidentId !== 'string' || value.incidentId.length > 120 || !isUuid(value.runId) || typeof value.contentVersion !== 'string' || !value.contentVersion.length || value.contentVersion.length > 100 || !object(value.answers)) return false;
  const keys = Object.keys(value.answers);
  if (keys.length > 3 || keys.some(key => !/^[0-2]$/.test(key)) || keys.some((_, i) => !Object.hasOwn(value.answers as object, String(i)))) return false;
  if (Object.values(value.answers).some(choice => !Number.isInteger(choice) || (choice as number) < 0 || (choice as number) > 4)) return false;
  if (!Number.isInteger(value.cursor) || (value.cursor as number) < 0 || (value.cursor as number) > 3 || (value.cursor as number) > keys.length || keys.length > (value.cursor as number) + 1) return false;
  if (value.draft !== null && (!Number.isInteger(value.draft) || (value.draft as number) < 0 || (value.draft as number) > 4 || value.cursor !== keys.length || value.cursor === 3)) return false;
  if (![value.createdAt, value.updatedAt].every(time => typeof time === 'string' && time.length <= 40 && Number.isFinite(Date.parse(time)))) return false;
  if (value.pendingReset !== undefined && (!object(value.pendingReset) || (value.pendingReset.expectedRunId !== null && !isUuid(value.pendingReset.expectedRunId)))) return false;
  return true;
}
export function validateIncidentRun(value: unknown, incident: Incident): IncidentRun | null {
  if (!validShape(value) || value.incidentId !== incident.id || value.contentVersion !== incidentVersion(incident)) return null;
  if (Object.entries(value.answers).some(([key, choice]) => choice >= incident.steps[Number(key)].options.length)) return null;
  if (value.draft !== null && value.draft >= incident.steps[value.cursor].options.length) return null;
  return parseIncidentRun(value);
}
/** Old content may be transported for an explicit reset notice, never validated as current answers. */
export function incidentRunFromRow(value: unknown): IncidentRun | null {
  if (!object(value)) return null;
  const run = { incidentId: value.incident_id, runId: value.run_id, contentVersion: value.content_version, answers: value.answers, cursor: value.cursor, draft: value.draft, createdAt: value.created_at, updatedAt: value.updated_at };
  return validShape(run) ? structuredClone(run) : null;
}
export function mergeIncidentRuns(local: IncidentRun, cloud: IncidentRun): IncidentRun {
  if (local.incidentId !== cloud.incidentId) return structuredClone(cloud);
  if (local.runId !== cloud.runId || local.contentVersion !== cloud.contentVersion) {
    if (local.pendingReset && local.pendingReset.expectedRunId === cloud.runId) return structuredClone(local);
    return structuredClone(cloud);
  }
  const answers = { ...local.answers, ...cloud.answers };
  const cursor = Math.max(local.cursor, cloud.cursor);
  const draft = cursor < 3 && !(String(cursor) in answers) ? (local.cursor === cursor ? local.draft : cloud.draft) : null;
  return { ...cloud, answers, cursor, draft, updatedAt: local.updatedAt > cloud.updatedAt ? local.updatedAt : cloud.updatedAt };
}
/** Shape validation only: callers must validate against incidentVersion before resuming. */
export function parseIncidentRun(value: unknown): IncidentRun | null {
  if (!validShape(value)) return null;
  const { incidentId, runId, contentVersion, cursor, draft, createdAt, updatedAt } = value;
  return { incidentId, runId, contentVersion, answers: { ...value.answers }, cursor, draft, createdAt, updatedAt,
    ...(value.pendingReset ? { pendingReset: { expectedRunId: value.pendingReset.expectedRunId } } : {}) };
}
