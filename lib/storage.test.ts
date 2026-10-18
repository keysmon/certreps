import { beforeEach, describe, expect, it } from "vitest";
import { createAttempt, saveAttempt, getAttempt, listAttempts, recordResult, finishAttempt, missedQuestionIds, getInProgress, listInProgress, discardAttempt, saveProgress } from "./storage";

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
  it("lists every unfinished attempt for a cert, newest first (any mode)", () => {
    const a = createAttempt("aip-c01", "mock", ["q1"]);
    a.startedAt = 1000;
    saveAttempt(a);
    const b = createAttempt("aip-c01", "quick", ["q2"]);
    b.startedAt = 3000;
    saveAttempt(b);
    const c = createAttempt("aip-c01", "drill", ["q3"], "Domain 2");
    c.startedAt = 2000;
    saveAttempt(c);
    // Newest first, all three unfinished.
    expect(listInProgress("aip-c01").map((x) => x.attemptId)).toEqual([b.attemptId, c.attemptId, a.attemptId]);
    // A finished attempt drops out of the list.
    finishAttempt(b.attemptId, 10, 0);
    expect(listInProgress("aip-c01").map((x) => x.attemptId)).toEqual([c.attemptId, a.attemptId]);
    // Head of the list agrees with getInProgress (the dashboard's primary-resume target).
    expect(listInProgress("aip-c01")[0].attemptId).toBe(getInProgress("aip-c01")!.attemptId);
    // Other certs are not included.
    expect(listInProgress("other-c01")).toEqual([]);
  });
  it("discards a single attempt row, leaving the others intact", () => {
    const a = createAttempt("aip-c01", "mock", ["q1"]);
    saveAttempt(a);
    const b = createAttempt("aip-c01", "quick", ["q2"]);
    saveAttempt(b);
    discardAttempt(a.attemptId);
    expect(getAttempt(a.attemptId)).toBeNull();
    expect(getAttempt(b.attemptId)).not.toBeNull();
    expect(listAttempts("aip-c01").map((x) => x.attemptId)).toEqual([b.attemptId]);
    // Discarding an unknown id is a harmless no-op (does not corrupt the store).
    discardAttempt("does-not-exist");
    expect(listAttempts("aip-c01").length).toBe(1);
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

describe("createAttempt reveal flag", () => {
  it("sets reveal:true only for a study run and omits the key otherwise", () => {
    const study = createAttempt("aip-c01", "mock", ["q1"], undefined, true);
    expect(study.reveal).toBe(true);

    const exam = createAttempt("aip-c01", "mock", ["q1"]);
    expect(exam.reveal).toBeUndefined();
    expect("reveal" in exam).toBe(false); // exam rows stay byte-identical to today
  });
});


describe("unanswered flags are not misses", () => {
  it("does not add a never-answered flag to retry or erase an earlier wrong answer", () => {
    const old = createAttempt("aip-c01", "quick", ["q1"]);
    old.startedAt = 1000;
    saveAttempt(old);
    recordResult(old.attemptId, { questionId: "q1", chosen: [0], correct: false, flagged: false });
    const flagged = createAttempt("aip-c01", "mock", ["q1", "q2"]);
    flagged.startedAt = 2000;
    saveAttempt(flagged);
    for (const questionId of flagged.questionIds) recordResult(flagged.attemptId, { questionId, chosen: [], correct: false, flagged: true });
    expect(missedQuestionIds("aip-c01")).toEqual(["q1"]);
  });
});


it("keeps a finished attempt sealed against a stale tab recording or finishing it again", () => {
  const a = createAttempt("aip-c01", "mock", ["q1"]);
  saveAttempt(a);
  recordResult(a.attemptId, { questionId: "q1", chosen: [0], correct: false, flagged: false });
  finishAttempt(a.attemptId, 60, 0);
  const sealed = getAttempt(a.attemptId);
  recordResult(a.attemptId, { questionId: "q1", chosen: [1], correct: true, flagged: false });
  finishAttempt(a.attemptId, 600, 4);
  expect(getAttempt(a.attemptId)).toEqual(sealed);
});
