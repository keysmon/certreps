import { describe, expect, it } from "vitest";
import { mergeAttempts, pendingUploads, toRow, fromRow } from "./sync";
import type { Attempt, QuestionResult } from "./types";

function mk(over: Partial<Attempt> = {}): Attempt {
  return {
    attemptId: "a1",
    certId: "aip-c01",
    mode: "quick",
    questionIds: ["q1", "q2"],
    results: {},
    startedAt: 1000,
    finishedAt: null,
    elapsedSec: 0,
    pauseCount: 0,
    ...over,
  };
}

// N recorded results (answered count = N).
function answered(n: number): Record<string, QuestionResult> {
  const r: Record<string, QuestionResult> = {};
  for (let i = 0; i < n; i++) r[`q${i}`] = { questionId: `q${i}`, chosen: [0], correct: true, flagged: false };
  return r;
}

describe("mergeAttempts", () => {
  it("unions disjoint sets (ids present on only one side survive)", () => {
    // Local-only unfinished is always kept (it is the device's own); the cloud-only side is FINISHED
    // so it survives too - a cloud-only UNFINISHED attempt is excluded (its own test below).
    const local = [mk({ attemptId: "L", startedAt: 100 })];
    const cloud = [mk({ attemptId: "C", finishedAt: 250, startedAt: 200 })];
    const ids = mergeAttempts(local, cloud).map((a) => a.attemptId);
    expect(ids.sort()).toEqual(["C", "L"]);
  });

  it("single-device-in-progress: excludes cloud-only unfinished, keeps cloud-only finished, still merges a shared unfinished id", () => {
    // (1) cloud-only UNFINISHED -> excluded (belongs to its home device).
    // (2) cloud-only FINISHED   -> included (finished rows sync everywhere).
    // (3) id present on BOTH sides + unfinished -> the single-device rule does NOT apply; the
    //     recency tree still picks the more-answered copy.
    const local = [
      mk({ attemptId: "L", finishedAt: 100, startedAt: 100 }),
      mk({ attemptId: "S", results: answered(1), startedAt: 400 }),
    ];
    const cloud = [
      mk({ attemptId: "CU", startedAt: 200 }),                            // (1) cloud-only, unfinished
      mk({ attemptId: "CF", finishedAt: 300, startedAt: 300 }),           // (2) cloud-only, finished
      mk({ attemptId: "S", results: answered(3), startedAt: 400 }),       // (3) shared id, cloud ahead
    ];
    const out = mergeAttempts(local, cloud);
    expect(out.map((a) => a.attemptId).sort()).toEqual(["CF", "L", "S"]); // CU excluded
    expect(Object.keys(out.find((a) => a.attemptId === "S")!.results).length).toBe(3);
  });

  it("same id: finished beats unfinished (local finished)", () => {
    const local = [mk({ attemptId: "X", finishedAt: 500 })];
    const cloud = [mk({ attemptId: "X", finishedAt: null })];
    const [win] = mergeAttempts(local, cloud);
    expect(win.finishedAt).toBe(500);
  });

  it("same id: finished beats unfinished (cloud finished)", () => {
    const local = [mk({ attemptId: "X", finishedAt: null })];
    const cloud = [mk({ attemptId: "X", finishedAt: 500 })];
    const [win] = mergeAttempts(local, cloud);
    expect(win.finishedAt).toBe(500);
  });

  it("same id both unfinished: more answered wins (cloud ahead)", () => {
    const local = [mk({ attemptId: "X", results: answered(1) })];
    const cloud = [mk({ attemptId: "X", results: answered(3) })];
    const [win] = mergeAttempts(local, cloud);
    expect(Object.keys(win.results).length).toBe(3);
  });

  it("same id both unfinished: more answered wins (local ahead)", () => {
    const local = [mk({ attemptId: "X", results: answered(4) })];
    const cloud = [mk({ attemptId: "X", results: answered(2) })];
    const [win] = mergeAttempts(local, cloud);
    expect(Object.keys(win.results).length).toBe(4);
  });

  it("same id both unfinished with equal answered count: keeps local", () => {
    const local = [mk({ attemptId: "X", results: answered(2), elapsedSec: 111 })];
    const cloud = [mk({ attemptId: "X", results: answered(2), elapsedSec: 999 })];
    const [win] = mergeAttempts(local, cloud);
    expect(win.elapsedSec).toBe(111);
  });

  it("same id both finished: keeps local (immutable + identical by C1 contract)", () => {
    const local = [mk({ attemptId: "X", finishedAt: 500, elapsedSec: 111 })];
    const cloud = [mk({ attemptId: "X", finishedAt: 500, elapsedSec: 999 })];
    const [win] = mergeAttempts(local, cloud);
    expect(win.elapsedSec).toBe(111);
  });

  it("sorts output by startedAt descending (newest first)", () => {
    const local = [mk({ attemptId: "A", startedAt: 100 }), mk({ attemptId: "C", startedAt: 300 })];
    // B is cloud-only FINISHED so it survives the merge and can exercise cross-side ordering.
    const cloud = [mk({ attemptId: "B", finishedAt: 250, startedAt: 200 })];
    expect(mergeAttempts(local, cloud).map((a) => a.attemptId)).toEqual(["C", "B", "A"]);
  });
});

describe("pendingUploads", () => {
  it("flags local attempts absent from cloud", () => {
    const local = [mk({ attemptId: "L1" }), mk({ attemptId: "L2" })];
    const cloud = [mk({ attemptId: "L1" })];
    // L1 is identical on both sides -> not newer; only L2 (absent) is pending.
    expect(pendingUploads(local, cloud).map((a) => a.attemptId)).toEqual(["L2"]);
  });

  it("flags local as pending when local is newer by the decision tree (local finished)", () => {
    const local = [mk({ attemptId: "X", finishedAt: 500 })];
    const cloud = [mk({ attemptId: "X", finishedAt: null })];
    expect(pendingUploads(local, cloud).map((a) => a.attemptId)).toEqual(["X"]);
  });

  it("flags local as pending when local has more answered (both unfinished)", () => {
    const local = [mk({ attemptId: "X", results: answered(3) })];
    const cloud = [mk({ attemptId: "X", results: answered(1) })];
    expect(pendingUploads(local, cloud).map((a) => a.attemptId)).toEqual(["X"]);
  });

  it("does NOT flag local when cloud is ahead (cloud finished)", () => {
    const local = [mk({ attemptId: "X", finishedAt: null })];
    const cloud = [mk({ attemptId: "X", finishedAt: 500 })];
    expect(pendingUploads(local, cloud)).toEqual([]);
  });

  it("does NOT flag local when cloud has more answered (both unfinished)", () => {
    const local = [mk({ attemptId: "X", results: answered(1) })];
    const cloud = [mk({ attemptId: "X", results: answered(3) })];
    expect(pendingUploads(local, cloud)).toEqual([]);
  });

  // Seam with mergeAttempts: a tie keeps local on merge but is NOT newer, so it must not upload.
  it("does NOT flag ties: equal answered count (both unfinished)", () => {
    const local = [mk({ attemptId: "X", results: answered(2) })];
    const cloud = [mk({ attemptId: "X", results: answered(2) })];
    expect(pendingUploads(local, cloud)).toEqual([]);
  });

  it("does NOT flag ties: both finished (identical by contract)", () => {
    const local = [mk({ attemptId: "X", finishedAt: 500 })];
    const cloud = [mk({ attemptId: "X", finishedAt: 500 })];
    expect(pendingUploads(local, cloud)).toEqual([]);
  });
});

describe("toRow / fromRow mapping", () => {
  const finished: Attempt = {
    attemptId: "att-42",
    certId: "aip-c01",
    mode: "drill",
    domain: "d-fundamentals",
    questionIds: ["q1", "q2", "q3"],
    results: {
      q1: { questionId: "q1", chosen: [0, 2], correct: true, flagged: false }, // multi-select chosen array
      q2: { questionId: "q2", chosen: [1], correct: false, flagged: true }, // flagged
      q3: { questionId: "q3", chosen: [], correct: false, flagged: false },
    },
    startedAt: 1720000000000,
    finishedAt: 1720000600000,
    elapsedSec: 600,
    pauseCount: 2,
  };

  it("round-trips deep-equal for a finished attempt (flags, multi-select, pauseCount)", () => {
    expect(fromRow(toRow(finished, "user-1"))).toEqual(finished);
  });

  it("maps snake_case columns and converts epoch ms timestamps to ISO strings", () => {
    const row = toRow(finished, "user-1", "2026-07-07T00:00:00.000Z");
    expect(row.user_id).toBe("user-1");
    expect(row.attempt_id).toBe("att-42");
    expect(row.cert_id).toBe("aip-c01");
    expect(row.mode).toBe("drill");
    expect(row.domain).toBe("d-fundamentals");
    expect(row.question_ids).toEqual(["q1", "q2", "q3"]);
    expect(row.started_at).toBe(new Date(1720000000000).toISOString());
    expect(row.finished_at).toBe(new Date(1720000600000).toISOString());
    expect(row.elapsed_sec).toBe(600);
    expect(row.pause_count).toBe(2);
  });

  it("passes results through structurally unchanged", () => {
    const row = toRow(finished, "user-1");
    expect(row.results).toEqual(finished.results);
  });

  it("uses the injected now for updated_at when provided", () => {
    const row = toRow(finished, "user-1", "2020-01-01T00:00:00.000Z");
    expect(row.updated_at).toBe("2020-01-01T00:00:00.000Z");
  });

  it("defaults updated_at to the current time when now is omitted", () => {
    const before = Date.now();
    const row = toRow(finished, "user-1");
    const after = Date.now();
    const t = Date.parse(row.updated_at);
    expect(t).toBeGreaterThanOrEqual(before);
    expect(t).toBeLessThanOrEqual(after);
  });

  it("round-trips a no-domain attempt (null column <-> undefined field)", () => {
    const noDomain = mk({ attemptId: "att-nd", mode: "mock", finishedAt: 1720000600000, startedAt: 1720000000000 });
    expect(toRow(noDomain, "user-1").domain).toBeNull();
    expect(fromRow(toRow(noDomain, "user-1"))).toEqual(noDomain);
  });

  it("drops user_id and updated_at on fromRow (no leaked snake_case keys)", () => {
    const restored = fromRow(toRow(finished, "user-1"));
    expect(restored).not.toHaveProperty("user_id");
    expect(restored).not.toHaveProperty("updated_at");
    expect(restored).not.toHaveProperty("started_at");
  });
});
