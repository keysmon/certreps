import type { Attempt } from "./types";

export const HEAVY_PAUSE_THRESHOLD = 3;
export type Verdict = "above" | "borderline" | "weak";

export function domainVerdict(pct: number, passLine: number): Verdict {
  if (pct >= passLine) return "above";
  if (pct >= passLine - 10) return "borderline";
  return "weak";
}

export interface GradedMock {
  attempt: Attempt;
  pct: number;
  byDomain: Record<string, { correct: number; total: number }>;
}

export interface ReadinessRead {
  trend: { attemptId: string; pct: number; heavilyPaused: boolean }[];
  domains: Record<string, { pct: number; verdict: Verdict }>;
}

/** Trend = up to the last 5 finished mocks; domain verdicts use the most recent
 *  non-heavily-paused mock (falls back to the most recent one if all are paused).
 *  Verdicts source the single most recent clean mock rather than an average because
 *  recency reflects current ability more accurately than historical average. The source
 *  search is scoped to the 5-mock window by design - an older clean mock is intentionally
 *  ignored, consistent with the recency-first policy. */
export function readinessRead(mocks: GradedMock[], passLine: number): ReadinessRead {
  const finished = mocks
    .filter((m) => m.attempt.finishedAt !== null)
    .sort((a, b) => a.attempt.startedAt - b.attempt.startedAt);
  const recent = finished.slice(-5);
  const trend = recent.map((m) => ({
    attemptId: m.attempt.attemptId,
    pct: m.pct,
    heavilyPaused: m.attempt.pauseCount >= HEAVY_PAUSE_THRESHOLD,
  }));
  const source =
    [...recent].reverse().find((m) => m.attempt.pauseCount < HEAVY_PAUSE_THRESHOLD) ??
    recent[recent.length - 1];
  const domains: ReadinessRead["domains"] = {};
  if (source) {
    for (const [name, v] of Object.entries(source.byDomain)) {
      const pct = v.total ? Math.round((v.correct / v.total) * 100) : 0;
      domains[name] = { pct, verdict: domainVerdict(pct, passLine) };
    }
  }
  return { trend, domains };
}
