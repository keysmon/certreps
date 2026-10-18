import { getBank, attemptUsesActiveQuestions } from "./bank";
import { readinessRead, type GradedMock, type ReadinessRead } from "./readiness";
import { gradeAttempt } from "./scoring";
import { questionsByIds } from "./sampler";
import { listAttempts } from "./storage";

export type CertStatus = "Not started" | "In progress" | "Ready";

export interface ProgressView {
  /** Best finished-mock overall %, 0 when no finished mock exists. This ONE number is
   *  both the catalog card's readiness bar and the cert-detail readiness ring, so a card
   *  and its Status facet (or a detail ring and its label) can never contradict. */
  bestMockPct: number;
  status: CertStatus;
}

/** The cert's finished EXAM mocks (study runs with `reveal` are excluded - they are a study tool,
 *  not an exam-condition assessment), graded (attempt + overall pct + per-domain tallies). Shared
 *  by progressView (best overall %) and domainReadiness (C10 per-domain read) so both read the same
 *  attempt set. Reads localStorage - call only client-side (SSR returns []). */
function gradedFinishedMocks(certId: string): GradedMock[] {
  const bank = getBank(certId);
  return listAttempts(certId)
    .filter((a) => a.mode === "mock" && !a.reveal && a.finishedAt !== null && attemptUsesActiveQuestions(a, bank))
    .map((a) => {
      const g = gradeAttempt(a, questionsByIds(bank, a.questionIds));
      return { attempt: a, pct: g.pct, byDomain: g.byDomain };
    });
}

/**
 * Local progress read for a cert, derived from its finished mocks. bestMockPct IS the
 * readiness bar/ring; status derives from the SAME number, so the two never disagree
 * (the Task 4 catalog reconciliation, now the single source of truth for catalog + detail).
 * Precedence: Ready is checked first, so a passed-then-restarted cert reads "Ready" and
 * shows its passing score. An unfinished attempt with no finished mock reads "In progress"
 * over a 0% bar (honest: work exists, no score yet).
 */
export function progressView(certId: string, passLinePct: number): ProgressView {
  const finished = gradedFinishedMocks(certId);
  const bestMockPct = finished.length ? Math.max(...finished.map((m) => m.pct)) : 0;
  // ANY attempt - any mode, finished or not - means the cert is started. The old read
  // (unfinished attempts + finished mocks only) flipped a cert BACK to "Not started"
  // the moment a drill or quick session was completed (user-reported, 2026-07-10).
  const started = listAttempts(certId).length > 0;
  const status: CertStatus =
    finished.length && bestMockPct >= passLinePct ? "Ready" : started ? "In progress" : "Not started";
  return { bestMockPct, status };
}

/**
 * Per-domain readiness for the cert detail page: OUR C10 semantics (lib/readiness.readinessRead)
 * over the cert's finished mocks - verdicts band the most-recent non-heavily-paused mock's
 * domain accuracy against passLine (recency-first, not an aggregate). Empty domains when no
 * finished mock exists (the SSR / not-started default).
 */
export function domainReadiness(certId: string, passLinePct: number): ReadinessRead {
  return readinessRead(gradedFinishedMocks(certId), passLinePct);
}


/** Domain practice records effort separately from exam-mock readiness.
 * Archived attempts still represent completed work; their scores never feed readiness. */
export function domainPracticeProgress(certId: string): Record<string, { completedDrills: number }> {
  const progress: Record<string, { completedDrills: number }> = {};
  const bank = getBank(certId);
  const knownDomains = new Set(bank.map((q) => q.domain));
  for (const attempt of listAttempts(certId)) {
    if (attempt.mode !== "drill" || !attempt.domain || !knownDomains.has(attempt.domain)) continue;
    const entry = progress[attempt.domain] ??= { completedDrills: 0 };
    if (attempt.finishedAt !== null) entry.completedDrills++;
  }
  return progress;
}
