import { beforeEach, describe, expect, it } from "vitest";
import { createAttempt, saveAttempt, getAttempt, listAttempts, recordResult, finishAttempt, missedQuestionIds, getInProgress, saveProgress } from "./storage";

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
  it("finds the latest resumable in-progress attempt (any mode)", () => {
    const older = createAttempt("aip-c01", "mock", ["q1"]);
    older.startedAt = 1000;
    saveAttempt(older);
    const newer = createAttempt("aip-c01", "quick", ["q2"]);
    newer.startedAt = 2000;
    saveAttempt(newer);
    // Latest unfinished wins regardless of mode.
    expect(getInProgress("aip-c01")?.attemptId).toBe(newer.attemptId);
    // Finishing the latest falls back to the older still-unfinished attempt.
    finishAttempt(newer.attemptId, 10, 0);
    expect(getInProgress("aip-c01")?.attemptId).toBe(older.attemptId);
    // Nothing unfinished -> null.
    finishAttempt(older.attemptId, 10, 0);
    expect(getInProgress("aip-c01")).toBeNull();
  });
  it("saveProgress snapshots elapsed + pauses on an unfinished attempt, never on a sealed one", () => {
    const a = createAttempt("aip-c01", "mock", ["q1", "q2"]);
    saveAttempt(a);
    saveProgress(a.attemptId, 90, 2);
    const mid = getAttempt(a.attemptId)!;
    expect(mid.elapsedSec).toBe(90);
    expect(mid.pauseCount).toBe(2);
    expect(mid.finishedAt).toBeNull(); // did not seal the attempt

    finishAttempt(a.attemptId, 120, 3);
    saveProgress(a.attemptId, 999, 9); // must no-op on a sealed attempt
    const sealed = getAttempt(a.attemptId)!;
    expect(sealed.elapsedSec).toBe(120);
    expect(sealed.pauseCount).toBe(3);
  });

  it("survives corrupted storage gracefully", () => {
    localStorage.setItem("certreps.attempts.v1", "{corrupt");
    expect(listAttempts("aip-c01")).toEqual([]);
  });
  it("clears missed questions when retried and answered correctly", () => {
    const a = createAttempt("aip-c01", "quick", ["q1"]);
    a.startedAt = 1000;
    saveAttempt(a);
    recordResult(a.attemptId, { questionId: "q1", chosen: [0], correct: false, flagged: false });
    finishAttempt(a.attemptId, 60, 0);

    const b = createAttempt("aip-c01", "retry", ["q1"]);
    b.startedAt = 2000;
    saveAttempt(b);
    recordResult(b.attemptId, { questionId: "q1", chosen: [1], correct: true, flagged: false });
    finishAttempt(b.attemptId, 30, 0);

    expect(missedQuestionIds("aip-c01")).toEqual([]);
  });
});
