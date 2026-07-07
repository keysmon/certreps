import type { Attempt, Mode, QuestionResult } from "./types";

const KEY = "certreps.attempts.v1";

function readAll(): Attempt[] {
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

function writeAll(attempts: Attempt[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(attempts));
  } catch {
    /* storage full or blocked - degrade silently; in-memory state still works */
  }
}

export function createAttempt(certId: string, mode: Mode, questionIds: string[], domain?: string): Attempt {
  return {
    attemptId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    certId,
    mode,
    domain,
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

export function getInProgress(certId: string, mode: Mode): Attempt | null {
  return listAttempts(certId).find((a) => a.mode === mode && a.finishedAt === null) ?? null;
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
