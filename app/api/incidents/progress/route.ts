import { getSupabaseServer } from '@/lib/supabase/server';
import { getIncident } from '@/lib/incidents';
import { incidentRunFromRow, isUuid, validateIncidentRun } from '@/lib/incident-progress';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie' };
function json(body: unknown, status = 200) { return Response.json(body, { status, headers }); }
async function authenticated(owner: unknown) {
  const client = await getSupabaseServer();
  if (!client) return { response: json({ error: 'Cloud progress unavailable' }, 503) };
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return { response: json({ error: 'Sign in required' }, 401) };
  if (!isUuid(owner)) return { response: json({ error: 'Invalid account' }, 400) };
  if (data.user.id !== owner) return { response: json({ error: 'Account changed' }, 409) };
  return { client, ownerId: data.user.id };
}
export async function GET(request: Request) {
  try {
    const auth = await authenticated(new URL(request.url).searchParams.get('owner'));
    if (auth.response) return auth.response;
    const { data, error } = await auth.client.from('incident_progress').select('*').eq('user_id', auth.ownerId);
    if (error || !Array.isArray(data)) return json({ error: 'Could not load progress' }, 503);
    const runs = data.map(incidentRunFromRow);
    if (runs.some(run => !run || !getIncident(run.incidentId))) return json({ error: 'Could not load progress' }, 503);
    return json({ ownerId: auth.ownerId, runs });
  } catch { return json({ error: 'Cloud progress unavailable' }, 503); }
}
async function boundedJson(request: Request): Promise<unknown> {
  if (Number(request.headers.get('content-length')) > 16384) throw new Error('body too large');
  if (!request.body) throw new Error('missing body');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16384) { await reader.cancel(); throw new Error('body too large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes));
}
export async function POST(request: Request) {
  let body: unknown;
  try { body = await boundedJson(request); } catch { return json({ error: 'Invalid progress' }, 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Invalid progress' }, 400);
  const input = body as Record<string, unknown>;
  if (input.reset !== undefined && typeof input.reset !== 'boolean') return json({ error: 'Invalid reset' }, 400);
  if (input.expectedRunId !== undefined && input.expectedRunId !== null && !isUuid(input.expectedRunId)) return json({ error: 'Invalid reset' }, 400);
  if (input.reset && input.expectedRunId === undefined) return json({ error: 'Reset requires previous run' }, 400);
  const candidate = input.run as Record<string, unknown> | undefined;
  const incident = candidate && typeof candidate.incidentId === 'string' ? getIncident(candidate.incidentId) : undefined;
  const run = incident && validateIncidentRun(candidate, incident);
  if (!run || (input.reset && (Object.keys(run.answers).length || run.cursor !== 0 || run.draft !== null))) return json({ error: 'Invalid progress' }, 400);
  try {
    const auth = await authenticated(input.ownerId);
    if (auth.response) return auth.response;
    const { data, error } = await auth.client.rpc('save_incident_progress', {
      p_incident_id: run.incidentId, p_run_id: run.runId, p_content_version: run.contentVersion,
      p_answers: run.answers, p_cursor: run.cursor, p_draft: run.draft,
      p_reset: input.reset ?? false, p_expected_run_id: input.expectedRunId ?? null,
    });
    const canonical = !error && Array.isArray(data) && data.length === 1 ? incidentRunFromRow(data[0]) : null;
    if (!canonical || canonical.incidentId !== run.incidentId) return json({ error: 'Could not save progress' }, 503);
    return json({ ownerId: auth.ownerId, run: canonical });
  } catch { return json({ error: 'Cloud progress unavailable' }, 503); }
}
