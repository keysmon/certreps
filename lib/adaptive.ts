import type { Attempt, Question } from "./types";

/** Tunable weighting constants (see docs/specs/2026-07-12-aip-c01-adaptive-frequency-design.md). */
export const ADAPTIVE = {
  UNSEEN: 2.0,
  MISSED: 3.0,
  MASTERY_BASE: 0.5,
  MASTERY_FLOOR: 0.15,
  RECENT_DAMP: 0.5,
  CONCEPT_MIN_SAMPLES: 5,
  CONCEPT_WEAK: 2.0,
  CONCEPT_SOFT: 1.4,
  CONCEPT_OK: 1.0,
  CONCEPT_STRONG: 0.7,
  EPSILON: 0.01,
} as const;

function conceptFactor(acc: number): number {
  if (acc < 0.5) return ADAPTIVE.CONCEPT_WEAK;
  if (acc < 0.75) return ADAPTIVE.CONCEPT_SOFT;
  if (acc < 0.9) return ADAPTIVE.CONCEPT_OK;
  return ADAPTIVE.CONCEPT_STRONG;
}

/**
 * Per-question sampling weight from the user's attempt history. Higher = show more.
 * Pure: same inputs -> same output. Cold start (no attempts) -> every question UNSEEN.
 */
export function buildWeights(attempts: Attempt[], bank: Question[]): Map<string, number> {
  const ordered = [...attempts].sort(
    (a, b) => (a.finishedAt ?? a.startedAt) - (b.finishedAt ?? b.startedAt),
  );
  const conceptById = new Map(bank.map((q) => [q.id, q.concept]));
  const history = new Map<string, boolean[]>();        // qid -> verdicts in time order
  const cAnswered = new Map<string, number>();
  const cCorrect = new Map<string, number>();
  for (const a of ordered) {
    for (const r of Object.values(a.results)) {
      if (r.chosen.length === 0) continue;
      let h = history.get(r.questionId);
      if (!h) { h = []; history.set(r.questionId, h); }
      h.push(r.correct);
      const concept = conceptById.get(r.questionId);
      if (concept) {
        cAnswered.set(concept, (cAnswered.get(concept) ?? 0) + 1);
        if (r.correct) cCorrect.set(concept, (cCorrect.get(concept) ?? 0) + 1);
      }
    }
  }
  const recentSet = new Set<string>(
    ordered.length ? Object.values(ordered[ordered.length - 1].results).filter((r) => r.chosen.length > 0).map((r) => r.questionId) : [],
  );

  const weights = new Map<string, number>();
  for (const q of bank) {
    const h = history.get(q.id);
    let pq: number;
    if (!h || h.length === 0) {
      pq = ADAPTIVE.UNSEEN;
    } else if (!h[h.length - 1]) {
      pq = ADAPTIVE.MISSED;
    } else {
      let c = 0;
      for (let i = h.length - 1; i >= 0 && h[i]; i--) c++;
      pq = Math.max(ADAPTIVE.MASTERY_FLOOR, ADAPTIVE.MASTERY_BASE ** c);
    }
    if (recentSet.has(q.id)) pq *= ADAPTIVE.RECENT_DAMP;

    let cf = 1.0;
    if (q.concept) {
      const answered = cAnswered.get(q.concept) ?? 0;
      if (answered >= ADAPTIVE.CONCEPT_MIN_SAMPLES) cf = conceptFactor((cCorrect.get(q.concept) ?? 0) / answered);
    }
    weights.set(q.id, Math.max(ADAPTIVE.EPSILON, pq * cf));
  }
  return weights;
}
