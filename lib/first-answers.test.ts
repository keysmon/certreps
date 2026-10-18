import { describe, expect, it } from "vitest";
import type { Attempt, Question, QuestionResult } from "./types";
import { firstAnswerPerformance } from "./first-answers";

const bank: Question[] = ["q1", "q2", "q3", "archived"].map((id, i) => ({ id, domain: i === 1 ? "D2" : "D1", tag: "d", type: "single", stem: "?", options: ["a", "b"], correct: [1], explanation: "", difficulty: "easy", docUrl: "", ...(id === "archived" ? { excludedFromPractice: true } : {}) }));
const row = (questionId: string, correct = false, answeredAt?: number): QuestionResult => ({ questionId, correct, chosen: [0], flagged: false, ...(answeredAt === undefined ? {} : { answeredAt }) });
const attempt = (id: string, results: QuestionResult[], overrides: Partial<Attempt> = {}): Attempt => ({ attemptId: id, certId: "cert", mode: "quick", startedAt: 100, finishedAt: null, questionIds: results.map(r => r.questionId), results: Object.fromEntries(results.map(r => [r.questionId, r])), elapsedSec: 0, pauseCount: 0, ...overrides });

describe("firstAnswerPerformance", () => {
  it("reports an empty denominator, including a requested empty session", () => {
    expect(firstAnswerPerformance([], bank, "cert", "missing")).toEqual({ correct: 0, total: 0, pct: null, byDomain: {}, estimatedCount: 0, session: { correct: 0, total: 0, repeated: 0 } });
  });
  it("keeps earliest scored observations regardless of input order and counts session repeats", () => {
    const first = attempt("old", [row("q1", false, 120)]);
    const session = attempt("new", [row("q1", true, 220), row("q2", true, 230)], { startedAt: 200 });
    const expected = { correct: 1, total: 2, pct: 50, byDomain: { D1: { correct: 0, total: 1 }, D2: { correct: 1, total: 1 } }, estimatedCount: 0, session: { correct: 1, total: 1, repeated: 1 } };
    expect(firstAnswerPerformance([session, first], bank, "cert", "new")).toEqual(expected);
    expect(firstAnswerPerformance([first, session], bank, "cert", "new")).toEqual(expected);
  });
  it("uses final timed mock grading time, excluding unfinished mocks even with answeredAt", () => {
    const mock = attempt("mock", [row("q1", true, 110)], { mode: "mock", finishedAt: 500 });
    const practice = attempt("practice", [row("q1", false, 300)], { startedAt: 200 });
    const pending = attempt("pending", [row("q2", true, 150)], { mode: "mock" });
    const study = attempt("study", [row("q3", true, 250)], { mode: "mock", reveal: true });
    const out = firstAnswerPerformance([mock, pending, study, practice], bank, "cert", "mock");
    expect(out).toMatchObject({ total: 2, correct: 1, estimatedCount: 0, session: { correct: 0, total: 0, repeated: 1 } });
  });
  it("falls back to legacy start times, only counts winning estimates, and rejects timestamps before start", () => {
    const legacy = attempt("legacy", [row("q1"), row("q2", true, 50)]);
    const precise = attempt("precise", [row("q1", true, 90)], { startedAt: 80 });
    expect(firstAnswerPerformance([legacy, precise], bank, "cert")).toMatchObject({ correct: 2, total: 2, estimatedCount: 1 });
  });
  it("breaks score-time ties by start then attempt id deterministically", () => {
    const a = attempt("a", [row("q1", false, 300)], { startedAt: 150 });
    const b = attempt("b", [row("q1", true, 300)], { startedAt: 150 });
    const earlier = attempt("z", [row("q2", true, 300)]);
    const later = attempt("a2", [row("q2", false, 300)], { startedAt: 200 });
    expect(firstAnswerPerformance([b, a, later, earlier], bank, "cert")).toMatchObject({ correct: 1, total: 2 });
  });
  it("ignores flags, unknown/archived questions, other certs and malformed answer rows", () => {
    const invalid = attempt("invalid", [row("archived"), row("unknown"), row("q1")]);
    invalid.questionIds = ["archived", "unknown", "q2", "q3"];
    invalid.results.q2 = { ...row("q2"), chosen: [] };
    invalid.results.q3 = { ...row("q3"), chosen: [2] };
    const wrongKey = attempt("key", []); wrongKey.questionIds = ["q1"]; wrongKey.results.q2 = row("q1");
    const malformed = [null, {}, { ...attempt("bad", []), results: null }, attempt("wrong-cert", [row("q1")], { certId: "other" }), invalid, wrongKey] as Attempt[];
    expect(firstAnswerPerformance(malformed, bank, "cert").total).toBe(0);
    for (const bad of [{ chosen: [0, 0] }, { chosen: [0.5] }, { chosen: ["0"] }, { correct: "true" }, { questionId: "q2" }]) {
      const a = attempt("bad-answer", [row("q1")]); Object.assign(a.results.q1, bad);
      expect(firstAnswerPerformance([a], bank, "cert").total).toBe(0);
    }
  });
  it("prefers answered snapshots over a stale snapshot containing only flags", () => {
    const answered = attempt("same", [row("q1", true, 150)]);
    const flags = attempt("same", [{ ...row("q1"), chosen: [] }, { ...row("q2"), chosen: [] }]);
    expect(firstAnswerPerformance([answered, flags], bank, "cert", "same")).toMatchObject({ correct: 1, total: 1, session: { correct: 1, total: 1, repeated: 0 } });
  });
  it("deduplicates duplicate attempt snapshots, using final mock verdicts and counting a session once", () => {
    const stale = attempt("same", [row("q1", false)], { mode: "mock" });
    const final = { ...stale, finishedAt: 500, results: { q1: row("q1", true) } };
    expect(firstAnswerPerformance([stale, final, final], bank, "cert", "same")).toMatchObject({ correct: 1, total: 1, session: { correct: 1, total: 1, repeated: 0 } });
    expect(firstAnswerPerformance([final, stale], bank, "cert")).toEqual(firstAnswerPerformance([stale, final], bank, "cert"));
  });
});
