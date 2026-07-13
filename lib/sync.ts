import type { Attempt, Mode, QuestionResult } from "./types";

/**
 * Cloud row shape - mirrors supabase/migrations/0001_attempts.sql column-for-column.
 * snake_case columns; timestamptz columns surface as ISO strings; jsonb columns
 * (question_ids, results) carry the Attempt structures verbatim.
 */
export interface AttemptRow {
  user_id: string;
  attempt_id: string;
  cert_id: string;
  mode: Mode;
  domain: string | null;
  reveal: boolean | null;
  question_ids: string[];
  results: Record<string, QuestionResult>;
  started_at: string;
  finished_at: string | null;
  elapsed_sec: number;
  pause_count: number;
  updated_at: string;
}

/**
 * Recency decision tree for two copies of the SAME attemptId.
 *
 * Local Attempts carry no updatedAt field (lib/types.ts), so we cannot compare a
 * stored write timestamp. startedAt is invariant per attemptId - it is set once at
 * creation and the cloud copy mirrors the local one - so it can never break a same-id
 * tie. The honest recency signal is therefore finishedAt-presence plus answered-count:
 *
 *   1. exactly one side finished -> the finished side is ahead (finished beats unfinished)
 *   2. both finished             -> tie (immutable + identical by the C1 write-once contract)
 *   3. both unfinished           -> more answered results (Object.keys(results).length) is ahead;
 *                                   equal count is a tie
 *
 * Returns >0 when `a` is strictly ahead of `b`, <0 when `b` is ahead, 0 on a tie.
 */
function compareRecency(a: Attempt, b: Attempt): number {
  const aFin = a.finishedAt !== null;
  const bFin = b.finishedAt !== null;
  if (aFin !== bFin) return aFin ? 1 : -1; // finished beats unfinished
  if (aFin && bFin) return 0; // both finished: immutable + identical by C1 -> tie
  return Object.keys(a.results).length - Object.keys(b.results).length; // both unfinished
}

/**
 * Union of local + cloud attempts keyed by attemptId, one winner per id.
 * On a same-id conflict the cloud copy wins only when it is STRICTLY ahead; ties keep
 * local (the device you are on). Output is sorted by startedAt descending (newest first)
 * for the account page.
 *
 * SINGLE-DEVICE-IN-PROGRESS (Task 4 review, enforced here per the plan's Task 8 carried
 * constraint): a cloud-only UNFINISHED attempt - one whose id is absent locally - is SKIPPED.
 * It belongs to the device that started it. Adopting it here would make it resumable on THIS
 * device (getInProgress reads localStorage), and the recency tree above cannot reconcile a later
 * equal-count divergence without silently dropping one side. Cloud FINISHED rows, and any id
 * already present locally, still merge normally. This DEFERS foreign in-progress visibility, it
 * never loses data: the cloud row is untouched, so when the attempt finishes on its home device
 * the finished copy syncs everywhere on the next pull. Convergence: when the merge upgrades to a
 * results-map union, cloud-only unfinished attempts return and visibility + resumability come back
 * together. Known edge: if a device wipes localStorage before finishing, its own cloud unfinished
 * row becomes invisible cruft until "delete my data" - it can never finish (its home device lost
 * it) - acceptable for v1b.
 */
export function mergeAttempts(local: Attempt[], cloud: Attempt[]): Attempt[] {
  const localIds = new Set(local.map((l) => l.attemptId));
  const byId = new Map<string, Attempt>();
  for (const c of cloud) {
    if (c.finishedAt === null && !localIds.has(c.attemptId)) continue; // cloud-only in-progress: skip
    byId.set(c.attemptId, c);
  }
  for (const l of local) {
    const c = byId.get(l.attemptId);
    // Keep local unless the cloud copy is strictly ahead.
    byId.set(l.attemptId, c && compareRecency(c, l) > 0 ? c : l);
  }
  return [...byId.values()].sort((x, y) => y.startedAt - x.startedAt);
}

/**
 * Local attempts that need uploading: absent from cloud, or STRICTLY newer than the
 * cloud copy per the decision tree. Note the deliberate asymmetry with mergeAttempts:
 * a tie keeps local on merge but is not "newer", so a tie is never uploaded.
 */
export function pendingUploads(local: Attempt[], cloud: Attempt[]): Attempt[] {
  const byId = new Map<string, Attempt>();
  for (const c of cloud) byId.set(c.attemptId, c);
  return local.filter((l) => {
    const c = byId.get(l.attemptId);
    return !c || compareRecency(l, c) > 0;
  });
}

/** Attempt -> row for upsert. updated_at defaults to call time; inject `now` to keep it pure in tests. */
export function toRow(a: Attempt, userId: string, now: string = new Date().toISOString()): AttemptRow {
  return {
    user_id: userId,
    attempt_id: a.attemptId,
    cert_id: a.certId,
    mode: a.mode,
    domain: a.domain ?? null,
    reveal: a.reveal ?? null,
    question_ids: a.questionIds,
    results: a.results,
    started_at: new Date(a.startedAt).toISOString(),
    finished_at: a.finishedAt === null ? null : new Date(a.finishedAt).toISOString(),
    elapsed_sec: a.elapsedSec,
    pause_count: a.pauseCount,
    updated_at: now,
  };
}

/** Row -> Attempt. Drops user_id/updated_at; restores epoch-ms timestamps and the exact Attempt shape. */
export function fromRow(r: AttemptRow): Attempt {
  return {
    attemptId: r.attempt_id,
    certId: r.cert_id,
    mode: r.mode,
    domain: r.domain ?? undefined,
    ...(r.reveal ? { reveal: true } : {}),
    // Defensive: 'null'::jsonb satisfies the NOT NULL column constraint but would
    // crash Object.keys() in compareRecency - unreachable via toRow, cheap to guard.
    questionIds: r.question_ids ?? [],
    results: r.results ?? {},
    startedAt: new Date(r.started_at).getTime(),
    finishedAt: r.finished_at === null ? null : new Date(r.finished_at).getTime(),
    elapsedSec: r.elapsed_sec,
    pauseCount: r.pause_count,
  };
}
