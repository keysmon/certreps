import { beforeEach, describe, expect, it } from "vitest";
import { createAttempt, saveAttempt, getAttempt, listAttempts, recordResult, finishAttempt, missedQuestionIds, getInProgress } from "./storage";

beforeEach(() => localStorage.clear());

describe("attempt store", () => {
  it("creates, saves and lists attempts", () => {
    const a = createAttempt("aip-c01", "quick", ["aipc01-0001", "aipc01-0002"]);
    saveAttempt(a);
    expect(listAttempts("aip-c01").length).toBe(1);
    expect(getAttempt(a.attemptId)?.mode).toBe("quick");
  });
  it("records results and finishes", () => {
    const a = createAttempt("aip-c01", "quick", ["aipc01-0001"]);
    saveAttempt(a);
    recordResult(a.attemptId, { questionId: "aipc01-0001", chosen: [2], correct: true, flagged: false });
    finishAttempt(a.attemptId, 120, 1);
    const got = getAttempt(a.attemptId)!;
    expect(got.results["aipc01-0001"].correct).toBe(true);
    expect(got.finishedAt).not.toBeNull();
    expect(got.elapsedSec).toBe(120);
    expect(got.pauseCount).toBe(1);
  });
  it("collects missed question ids across finished attempts (dedup)", () => {
    const a = createAttempt("aip-c01", "quick", ["q1", "q2"]);
    saveAttempt(a);
    recordResult(a.attemptId, { questionId: "q1", chosen: [0], correct: false, flagged: false });
    recordResult(a.attemptId, { questionId: "q2", chosen: [1], correct: true, flagged: false });
    finishAttempt(a.attemptId, 60, 0);
    const b = createAttempt("aip-c01", "drill", ["q1"]);
    saveAttempt(b);
    recordResult(b.attemptId, { questionId: "q1", chosen: [0], correct: false, flagged: false });
    finishAttempt(b.attemptId, 30, 0);
    expect(missedQuestionIds("aip-c01")).toEqual(["q1"]);
  });
  it("finds a resumable in-progress attempt by mode", () => {
    const a = createAttempt("aip-c01", "mock", ["q1"]);
    saveAttempt(a);
    expect(getInProgress("aip-c01", "mock")?.attemptId).toBe(a.attemptId);
    finishAttempt(a.attemptId, 10, 0);
    expect(getInProgress("aip-c01", "mock")).toBeNull();
  });
  it("survives corrupted storage gracefully", () => {
    localStorage.setItem("preploop.attempts.v1", "{corrupt");
    expect(listAttempts("aip-c01")).toEqual([]);
  });
});
