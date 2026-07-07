import type { Attempt, Question } from "./types";

export function isCorrect(chosen: number[], correct: number[]): boolean {
  if (chosen.length !== correct.length) return false;
  const a = [...chosen].sort();
  const b = [...correct].sort();
  return a.every((v, i) => v === b[i]);
}

export interface Grade {
  score: number;
  total: number;
  pct: number;
  byDomain: Record<string, { correct: number; total: number }>;
  avgSecPerQuestion: number;
}

export function gradeAttempt(attempt: Attempt, questions: Question[]): Grade {
  const byDomain: Grade["byDomain"] = {};
  let score = 0;
  for (const q of questions) {
    const d = (byDomain[q.domain] ??= { correct: 0, total: 0 });
    d.total++;
    const r = attempt.results[q.id];
    if (r?.correct) { score++; d.correct++; }
  }
  const total = questions.length;
  return {
    score,
    total,
    pct: total ? Math.round((score / total) * 100) : 0,
    byDomain,
    avgSecPerQuestion: total ? Math.round(attempt.elapsedSec / total) : 0,
  };
}
