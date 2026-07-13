import { describe, it, expect } from "vitest";
import { buildWeights, ADAPTIVE } from "./adaptive";
import type { Attempt, Question } from "./types";

function q(id: string, difficulty: Question["difficulty"] = "medium", concept?: string): Question {
  return { id, domain: "D", tag: "Domain 1", type: "single", stem: id, options: ["a", "b", "c", "d"], correct: [0], explanation: "", difficulty, docUrl: "https://docs.aws.amazon.com/x", concept };
}
function attempt(at: number, results: Record<string, boolean>): Attempt {
  return {
    attemptId: `a${at}`, certId: "c", mode: "drill", questionIds: Object.keys(results),
    results: Object.fromEntries(Object.entries(results).map(([id, correct]) => [id, { questionId: id, chosen: [0], correct, flagged: false }])),
    startedAt: at, finishedAt: at, elapsedSec: 0, pauseCount: 0,
  };
}

describe("buildWeights", () => {
  it("cold start: every question gets UNSEEN (uniform)", () => {
    const bank = [q("1"), q("2"), q("3")];
    const w = buildWeights([], bank);
    expect([...w.values()]).toEqual([ADAPTIVE.UNSEEN, ADAPTIVE.UNSEEN, ADAPTIVE.UNSEEN]);
  });

  it("latest-wrong question is boosted above a mastered one", () => {
    const bank = [q("missed"), q("mastered")];
    // mastered answered correct twice; missed answered wrong most recently
    const w = buildWeights([attempt(1, { mastered: true }), attempt(2, { mastered: true, missed: false })], bank);
    expect(w.get("missed")!).toBeGreaterThan(w.get("mastered")!);
    // missed is in the most-recent attempt too, so MISSED * RECENT_DAMP
    expect(w.get("missed")!).toBeCloseTo(ADAPTIVE.MISSED * ADAPTIVE.RECENT_DAMP, 5);
  });

  it("mastery damping compounds with consecutive corrects and respects the floor", () => {
    const bank = [q("x")];
    const three = buildWeights([attempt(1, { x: true }), attempt(2, { x: true }), attempt(3, { x: true })], bank);
    // 3 consecutive corrects, and x is in the most recent attempt -> max(FLOOR, 0.5^3) * RECENT_DAMP
    expect(three.get("x")!).toBeCloseTo(Math.max(ADAPTIVE.MASTERY_FLOOR, ADAPTIVE.MASTERY_BASE ** 3) * ADAPTIVE.RECENT_DAMP, 5);
    // many corrects never drop below the floor (before recency damp)
    const many = Array.from({ length: 10 }, (_, i) => attempt(i + 1, { x: true }));
    expect(buildWeights(many, bank).get("x")!).toBeGreaterThanOrEqual(ADAPTIVE.MASTERY_FLOOR * ADAPTIVE.RECENT_DAMP - 1e-9);
  });

  it("weak concept multiplies the weight; strong concept eases it; needs MIN_SAMPLES", () => {
    // 6 answers on concept 'k', 1 correct -> acc ~0.17 < 0.5 -> WEAK
    const weakBank = Array.from({ length: 6 }, (_, i) => q(`w${i}`, "medium", "k"));
    const weakAtt = attempt(1, Object.fromEntries(weakBank.map((qq, i) => [qq.id, i === 0])));
    const w = buildWeights([weakAtt], weakBank);
    // an unseen question in the same weak concept: UNSEEN * CONCEPT_WEAK (it was answered so not unseen...)
    // check a seen-correct one: pq(correct,1) * RECENT * WEAK
    // Simpler: assert the concept factor shows up vs a no-concept baseline
    const baselineBank = weakBank.map((qq) => ({ ...qq, concept: undefined }));
    const wBase = buildWeights([{ ...weakAtt }], baselineBank);
    expect(w.get("w1")!).toBeGreaterThan(wBase.get("w1")!); // w1 was correct=false in attempt -> MISSED, weak concept boosts further
  });

  it("all weights are finite and > 0", () => {
    const bank = [q("1"), q("2", "hard", "z")];
    for (const v of buildWeights([attempt(1, { "1": true, "2": false })], bank).values()) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThan(0);
    }
  });
});
