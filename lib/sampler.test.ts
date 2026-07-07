import { describe, expect, it } from "vitest";
import { sampleMock, sampleQuick, sampleDrill, difficultyTargets } from "./sampler";
import { getBank, getMeta } from "./bank";

describe("difficultyTargets", () => {
  it("splits 20 as 5/10/5 (25/50/25, largest remainder)", () => {
    expect(difficultyTargets(20)).toEqual({ easy: 5, medium: 10, hard: 5 });
  });
  it("always sums to n", () => {
    for (let n = 1; n <= 30; n++) {
      const t = difficultyTargets(n);
      expect(t.easy + t.medium + t.hard).toBe(n);
    }
  });
});

describe("sampleMock", () => {
  it("returns exact per-domain counts from meta", () => {
    const qs = sampleMock(getBank(), getMeta());
    expect(qs.length).toBe(65);
    for (const d of getMeta().domains) {
      expect(qs.filter((q) => q.domain === d.name).length).toBe(d.mockCount);
    }
  });
  it("has no duplicate questions", () => {
    const qs = sampleMock(getBank(), getMeta());
    expect(new Set(qs.map((q) => q.id)).size).toBe(65);
  });
  it("two mocks differ in order (shuffled)", () => {
    const a = sampleMock(getBank(), getMeta()).map((q) => q.id).join(",");
    const b = sampleMock(getBank(), getMeta()).map((q) => q.id).join(",");
    expect(a).not.toBe(b); // astronomically unlikely to collide
  });
});

describe("sampleQuick / sampleDrill", () => {
  it("quick returns 10 unique", () => {
    const qs = sampleQuick(getBank(), 10);
    expect(qs.length).toBe(10);
    expect(new Set(qs.map((q) => q.id)).size).toBe(10);
  });
  it("drill returns only the requested domain", () => {
    const d = getMeta().domains[0].name;
    const qs = sampleDrill(getBank(), d, 10);
    expect(qs.length).toBe(10);
    expect(qs.every((q) => q.domain === d)).toBe(true);
  });
});
