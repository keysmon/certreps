import { describe, expect, it } from "vitest";
import { isCorrect, gradeAttempt } from "./scoring";
import type { Attempt, Question } from "./types";

const q = (id: string, domain: string, correct: number[], type: "single" | "multi" = "single"): Question => ({
  id, domain, tag: "Domain X", type, stem: "s", options: ["a", "b", "c", "d", "e"].slice(0, type === "single" ? 4 : 5),
  correct, explanation: "e", difficulty: "medium", docUrl: "https://docs.aws.amazon.com/x",
});

describe("isCorrect", () => {
  it("single: exact match", () => {
    expect(isCorrect([2], [2])).toBe(true);
    expect(isCorrect([1], [2])).toBe(false);
  });
  it("multi: order-insensitive exact set", () => {
    expect(isCorrect([3, 1], [1, 3])).toBe(true);
    expect(isCorrect([1], [1, 3])).toBe(false);
    expect(isCorrect([1, 2, 3], [1, 3])).toBe(false);
  });
});

describe("gradeAttempt", () => {
  it("scores and breaks down by domain", () => {
    const questions = [q("q1", "D1", [0]), q("q2", "D1", [1]), q("q3", "D2", [2])];
    const attempt: Attempt = {
      attemptId: "a", certId: "aip-c01", mode: "quick", questionIds: ["q1", "q2", "q3"],
      results: {
        q1: { questionId: "q1", chosen: [0], correct: true, flagged: false },
        q2: { questionId: "q2", chosen: [0], correct: false, flagged: false },
        // q3 unanswered
      },
      startedAt: 0, finishedAt: 1, elapsedSec: 90, pauseCount: 0,
    };
    const g = gradeAttempt(attempt, questions);
    expect(g.score).toBe(1);
    expect(g.total).toBe(3);
    expect(g.pct).toBe(33);
    expect(g.byDomain["D1"]).toEqual({ correct: 1, total: 2 });
    expect(g.byDomain["D2"]).toEqual({ correct: 0, total: 1 }); // unanswered counts wrong
    expect(g.avgSecPerQuestion).toBe(30);
  });
});
