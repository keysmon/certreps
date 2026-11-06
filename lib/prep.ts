import type { Attempt, CertMeta, Difficulty, Mode, Question } from "./types";
import { sampleQuick } from "./sampler";

export const PREP_SIZE = 20;
export const PREP_LABELS: Record<Difficulty, string> = { easy: "Foundation", medium: "Standard", hard: "Challenge" };
export function requestedPrepLevel(certId: string, mode: Mode, value: string | null): Difficulty | undefined {
  return certId === "aip-c01" && mode === "quick" && (value === "easy" || value === "medium" || value === "hard") ? value : undefined;
}
/** Fixed20 homogeneous quick sessions retain their identity through existing saved questionIds.
 * Other modes, legacy10-question quick sessions and incomplete records stay ordinary practice. */
export function prepLevel(attempt: Pick<Attempt, "certId" | "mode" | "questionIds">, bank: Question[]): Difficulty | undefined {
  if (attempt.certId !== "aip-c01" || attempt.mode !== "quick" || attempt.questionIds.length !== PREP_SIZE) return;
  const byId = new Map(bank.map(q => [q.id, q]));
  const level = byId.get(attempt.questionIds[0])?.difficulty;
  return level && attempt.questionIds.every(id => byId.get(id)?.difficulty === level) ? level : undefined;
}
/** Strict difficulty boundary: never make a Challenge set easier to fill its slots. */
export function samplePrep(bank: Question[], level: Difficulty, meta: Pick<CertMeta, "domains">, weights?: Map<string, number>): Question[] {
  const eligible = bank.filter(q => !q.excludedFromPractice && q.difficulty === level);
  return eligible.length < PREP_SIZE ? [] : sampleQuick(eligible, PREP_SIZE, weights, meta);
}
