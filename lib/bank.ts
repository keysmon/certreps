import type { Attempt, CertMeta, Question } from "./types";
import { getCert } from "./certs";

const DEFAULT_CERT = "aip-c01";

// certId defaults to aip-c01 so existing no-arg callers are unchanged; new
// callers pass certId explicitly. Unknown certs throw (routes guard with
// getCert() ?? notFound() before ever reaching here).
/**
 * Throws on unknown certId (loud internal failure). User-facing routes must guard
 * with getCert(certId) ?? notFound() BEFORE calling this - see lib/certs.ts.
 */
export function getBank(certId: string = DEFAULT_CERT): Question[] {
  const cert = getCert(certId);
  if (!cert) throw new Error(`Unknown certId: ${certId}`);
  return cert.bank;
}

export function getMeta(certId: string = DEFAULT_CERT): CertMeta {
  const cert = getCert(certId);
  if (!cert) throw new Error(`Unknown certId: ${certId}`);
  return cert.meta;
}

export function byDomain(bank: Question[]): Record<string, Question[]> {
  const out: Record<string, Question[]> = {};
  for (const q of bank) (out[q.domain] ??= []).push(q);
  return out;
}

/** Active view for new practice. getBank remains the complete historical archive. */
export function getPracticeBank(certId: string = DEFAULT_CERT): Question[] {
  return getBank(certId).filter((q) => !q.excludedFromPractice);
}

/** An old attempt is safe to resume/score for readiness only while every item is active. */
export function attemptUsesActiveQuestions(attempt: Pick<Attempt, "questionIds">, bank: Question[]): boolean {
  const activeIds = new Set(bank.filter((q) => !q.excludedFromPractice).map((q) => q.id));
  return attempt.questionIds.length > 0 && attempt.questionIds.every((id) => activeIds.has(id));
}
