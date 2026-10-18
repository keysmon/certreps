import type { Attempt, Question } from "./types";

type Counts = { correct: number; total: number };
export interface FirstAnswerPerformance extends Counts {
  pct: number | null;
  byDomain: Record<string, Counts>;
  estimatedCount: number;
  session?: Counts & { repeated: number };
}

type Observation = { questionId: string; domain: string; correct: boolean; time: number; start: number; attemptId: string; estimated: boolean };
const validTime = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;
const compareText = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;

/** First scored answers in saved history, not proof of a learner's first exposure.
 * Legacy immediate-feedback answers approximate ordering with the session start. */
export function firstAnswerPerformance(attempts: Attempt[], bank: Question[], certId: string, sessionId?: string): FirstAnswerPerformance {
  const output: FirstAnswerPerformance = { correct: 0, total: 0, pct: null, byDomain: {}, estimatedCount: 0,
    ...(sessionId !== undefined ? { session: { correct: 0, total: 0, repeated: 0 } } : {}) };
  const questions = new Map(bank.filter(q => q && typeof q.id === "string" && typeof q.domain === "string" && !q.excludedFromPractice && Array.isArray(q.options) && q.options.length > 0 && (q.type === "single" || q.type === "multi")).map(q => [q.id, q]));
  const snapshots = new Map<string, Attempt>();
  // Repeated copies of a saved attempt are one session. Prefer a finalized snapshot,
  // then the most complete copy; use a stable tie-break for divergent imported copies.
  const rank = (a: Attempt) => [a.finishedAt !== null ? 1 : 0, Object.values(a.results).filter(r => r && Array.isArray(r.chosen) && r.chosen.length > 0).length] as const;
  for (const a of attempts) {
    if (!a || a.certId !== certId || typeof a.attemptId !== "string" || !validTime(a.startedAt) || !Array.isArray(a.questionIds) || !a.results || typeof a.results !== "object" || Array.isArray(a.results) || !["quick", "drill", "retry", "mock"].includes(a.mode)) continue;
    if (a.finishedAt !== null && (!validTime(a.finishedAt) || a.finishedAt < a.startedAt)) continue;
    const old = snapshots.get(a.attemptId);
    const ar = rank(a), br = old && rank(old);
    if (!old || ar[0] > br![0] || (ar[0] === br![0] && (ar[1] > br![1] || (ar[1] === br![1] && compareText(JSON.stringify(a), JSON.stringify(old)) > 0)))) snapshots.set(a.attemptId, a);
  }
  const observations: Observation[] = [];
  for (const a of snapshots.values()) {
    const timed = a.mode === "mock" && !a.reveal;
    if (timed && a.finishedAt === null) continue;
    const ids = new Set(a.questionIds);
    for (const [key, r] of Object.entries(a.results)) {
      const q = questions.get(key);
      if (!q || !ids.has(key) || !r || r.questionId !== key || typeof r.correct !== "boolean" || !Array.isArray(r.chosen) || r.chosen.length === 0) continue;
      if ((q.type === "single" && r.chosen.length !== 1) || new Set(r.chosen).size !== r.chosen.length || r.chosen.some(i => !Number.isInteger(i) || i < 0 || i >= q.options.length)) continue;
      const precise = validTime(r.answeredAt) && r.answeredAt >= a.startedAt;
      observations.push({ questionId: key, domain: q.domain, correct: r.correct, time: timed ? a.finishedAt! : precise ? r.answeredAt! : a.startedAt, start: a.startedAt, attemptId: a.attemptId, estimated: !timed && !precise });
    }
  }
  observations.sort((a, b) => a.time - b.time || a.start - b.start || compareText(a.attemptId, b.attemptId));
  const seen = new Set<string>();
  for (const observation of observations) {
    if (seen.has(observation.questionId)) {
      if (observation.attemptId === sessionId) output.session!.repeated++;
      continue;
    }
    seen.add(observation.questionId);
    output.total++;
    output.correct += Number(observation.correct);
    output.estimatedCount += Number(observation.estimated);
    // Define own keys so even imported domain names such as __proto__ stay data.
    if (!Object.prototype.hasOwnProperty.call(output.byDomain, observation.domain)) Object.defineProperty(output.byDomain, observation.domain, { value: { correct: 0, total: 0 }, enumerable: true });
    output.byDomain[observation.domain].total++;
    output.byDomain[observation.domain].correct += Number(observation.correct);
    if (observation.attemptId === sessionId) {
      output.session!.total++;
      output.session!.correct += Number(observation.correct);
    }
  }
  output.pct = output.total ? Math.round(output.correct / output.total * 100) : null;
  return output;
}
