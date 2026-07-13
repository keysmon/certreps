import type { Attempt, Mode, QuestionResult } from "./types";
import { queueUpsert } from "./sync-runtime";

const KEY = "certreps.attempts.v1";

export function readAll(): Attempt[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((a): a is Attempt => a !== null && typeof a === "object") : [];
  } catch {
    return [];
  }
}

export function writeAll(attempts: Attempt[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(attempts));
  } catch {
    /* storage full or blocked - degrade silently; in-memory state still works */
  }
}

/** Wipe the local attempt store. Used by the account "Delete my data" action after the
 *  cloud rows are deleted and the session is signed out. Degrades silently if blocked. */
export function clearAll(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* storage blocked - nothing else to do */
  }
}

export function createAttempt(certId: string, mode: Mode, questionIds: string[], domain?: string, reveal?: boolean): Attempt {
  return {
    attemptId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    certId,
    mode,
    domain,
    // Only set when true so exam-mock rows are byte-identical to pre-feature rows (backward compat).
    ...(reveal ? { reveal: true } : {}),
    questionIds,
    results: {},
    startedAt: Date.now(),
    finishedAt: null,
    elapsedSec: 0,
    pauseCount: 0,
  };
}

/** Call once after createAttempt to persist the new attempt. Afterwards use recordResult/finishAttempt only - re-saving a stale engine-held copy would clobber recorded results. */
export function saveAttempt(a: Attempt): void {
  const all = readAll().filter((x) => x.attemptId !== a.attemptId);
  all.push(a);
  writeAll(all);
  // Write-through cloud mirror (no-op when signed out/unavailable). This is the single
  // write path - recordResult and finishAttempt both persist through here, so a finished
  // attempt is upserted immediately and mid-exam writes are debounced. Guarded so sync can
  // never surface to the engine, even though queueUpsert already never throws by contract.
  try {
    queueUpsert(a);
  } catch {
    /* sync must never break the localStorage write-once contract */
  }
}

export function getAttempt(attemptId: string): Attempt | null {
  return readAll().find((a) => a.attemptId === attemptId) ?? null;
}

export function listAttempts(certId: string): Attempt[] {
  return readAll().filter((a) => a.certId === certId).sort((x, y) => x.startedAt - y.startedAt);
}

export function recordResult(attemptId: string, r: QuestionResult): void {
  const a = getAttempt(attemptId);
  if (!a) return;
  a.results[r.questionId] = r;
  saveAttempt(a);
}

export function finishAttempt(attemptId: string, elapsedSec: number, pauseCount: number): void {
  const a = getAttempt(attemptId);
  if (!a) return;
  a.finishedAt = Date.now();
  a.elapsedSec = elapsedSec;
  a.pauseCount = pauseCount;
  saveAttempt(a);
}

/**
 * Snapshot in-flight timer progress (elapsed + pauses) onto an UNFINISHED attempt so a resumed
 * attempt restores an honest clock rather than a near-full one (Task 8). Writes localStorage ONLY
 * - no cloud upsert: resume reads localStorage (single-device-in-progress semantics), and the next
 * recordResult/finishAttempt upserts the full state to the cloud, so spamming an upsert per tick is
 * both unnecessary and wasteful. No-ops on a sealed attempt - the finished write is authoritative and
 * a post-expiry tick must never clobber it.
 */
export function saveProgress(attemptId: string, elapsedSec: number, pauseCount: number): void {
  const all = readAll();
  const a = all.find((x) => x.attemptId === attemptId);
  if (!a || a.finishedAt !== null) return;
  a.elapsedSec = elapsedSec;
  a.pauseCount = pauseCount;
  writeAll(all);
}

/**
 * Latest LOCAL unfinished attempt for a cert (any mode, newest by startedAt), or null.
 * Powers the cert-page resume banner. Reads only localStorage - single-device-in-progress
 * semantics (Task 4 review, carried to Task 8): an in-progress attempt is resumable only
 * where it lives locally, because the equal-count merge tree cannot reconcile a cross-device
 * divergence without silently dropping one side.
 */
export function getInProgress(certId: string): Attempt | null {
  const unfinished = listAttempts(certId).filter((a) => a.finishedAt === null);
  return unfinished.length ? unfinished[unfinished.length - 1] : null;
}

/**
 * Every LOCAL unfinished attempt for a cert, newest first (by startedAt descending). Powers the
 * resume-everywhere surfaces (practice interstitial, multi-attempt detail links, dashboard rows).
 * listInProgress(certId)[0] equals getInProgress(certId) - the same single-device-in-progress read,
 * just widened from "the latest" to "all of them". Reads only localStorage (see getInProgress).
 */
export function listInProgress(certId: string): Attempt[] {
  return listAttempts(certId)
    .filter((a) => a.finishedAt === null)
    .sort((x, y) => y.startedAt - x.startedAt);
}

/**
 * Delete one attempt row from localStorage. Used by the resume-everywhere "Discard" controls.
 *
 * INVARIANT - only ever call this on an UNFINISHED attempt. A signed-in user's cloud row is left
 * in place (this makes no sync-runtime call, by design): on the next fullSync, mergeAttempts SKIPS
 * a cloud-only UNFINISHED row whose id is absent locally, so a discarded in-progress attempt stays
 * gone. A FINISHED cloud row, by contrast, always merges back - so discarding a finished attempt
 * here would resurrect it on the next pull. The discard UIs are wired to in-progress attempts only.
 * Degrades silently if storage is blocked, matching the rest of this module.
 */
export function discardAttempt(attemptId: string): void {
  writeAll(readAll().filter((a) => a.attemptId !== attemptId));
}

/** Latest verdict wins: a question is "missed" if its most recent recorded result is wrong. */
export function missedQuestionIds(certId: string): string[] {
  const latest: Record<string, { at: number; correct: boolean }> = {};
  for (const a of listAttempts(certId)) {
    for (const r of Object.values(a.results)) {
      const at = a.finishedAt ?? a.startedAt;
      if (!latest[r.questionId] || at >= latest[r.questionId].at) {
        latest[r.questionId] = { at, correct: r.correct };
      }
    }
  }
  return Object.entries(latest).filter(([, v]) => !v.correct).map(([id]) => id);
}
