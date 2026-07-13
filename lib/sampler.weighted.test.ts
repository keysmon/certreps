import { describe, it, expect } from "vitest";
import { sampleDrill, sampleQuick } from "./sampler";
import type { Question } from "./types";

function q(id: string, difficulty: Question["difficulty"]): Question {
  return { id, domain: "D", tag: "Domain 1", type: "single", stem: id, options: ["a","b","c","d"], correct: [0], explanation: "", difficulty, docUrl: "https://docs.aws.amazon.com/x" };
}
// 30 questions, balanced difficulty
const bank: Question[] = [
  ...Array.from({ length: 10 }, (_, i) => q(`e${i}`, "easy")),
  ...Array.from({ length: 10 }, (_, i) => q(`m${i}`, "medium")),
  ...Array.from({ length: 10 }, (_, i) => q(`h${i}`, "hard")),
];

describe("weighted sampling", () => {
  it("preserves the 25/50/25 difficulty mix when weighted", () => {
    const weights = new Map(bank.map((x) => [x.id, 1]));
    const picked = sampleDrill(bank, "D", 12, weights);
    const byDiff = { easy: 0, medium: 0, hard: 0 } as Record<string, number>;
    for (const p of picked) byDiff[p.difficulty]++;
    expect(picked.length).toBe(12);
    expect(byDiff.easy).toBe(3); expect(byDiff.medium).toBe(6); expect(byDiff.hard).toBe(3);
  });

  it("a heavily-weighted question is picked far more often than a near-zero one", () => {
    // Heavy medium 'm0' vs the other mediums near-zero. Over many trials m0 should dominate its bucket.
    const weights = new Map(bank.map((x) => [x.id, x.id === "m0" ? 1000 : 0.001]));
    let m0Count = 0;
    for (let t = 0; t < 100; t++) {
      if (sampleDrill(bank, "D", 12, weights).some((p) => p.id === "m0")) m0Count++;
    }
    expect(m0Count).toBeGreaterThan(90);
  });

  it("no-weights path still returns a valid balanced sample", () => {
    const picked = sampleQuick(bank, 12);
    expect(picked.length).toBe(12);
    expect(new Set(picked.map((p) => p.id)).size).toBe(12); // no dupes
  });
});
