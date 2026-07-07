import { describe, expect, it } from "vitest";
import { readinessRead, domainVerdict, HEAVY_PAUSE_THRESHOLD } from "./readiness";
import type { Attempt } from "./types";

const mock = (id: string, pct: number, pauses: number, domains: Record<string, { correct: number; total: number }>): { attempt: Attempt; pct: number; byDomain: Record<string, { correct: number; total: number }> } => ({
  attempt: { attemptId: id, certId: "aip-c01", mode: "mock", questionIds: [], results: {}, startedAt: Number(id), finishedAt: Number(id) + 1, elapsedSec: 100, pauseCount: pauses },
  pct, byDomain: domains,
});

describe("domainVerdict", () => {
  it("classifies above/borderline/weak", () => {
    expect(domainVerdict(80, 75)).toBe("above");
    expect(domainVerdict(70, 75)).toBe("borderline");
    expect(domainVerdict(50, 75)).toBe("weak");
  });
});

describe("readinessRead", () => {
  it("needs at least one finished mock", () => {
    expect(readinessRead([], 75).trend).toEqual([]);
  });
  it("builds trend from recent mocks and flags heavy pauses", () => {
    const r = readinessRead(
      [
        mock("1", 60, 0, { D1: { correct: 6, total: 10 } }),
        mock("2", 74, HEAVY_PAUSE_THRESHOLD, { D1: { correct: 7, total: 10 } }),
        mock("3", 81, 0, { D1: { correct: 9, total: 10 } }),
      ],
      75
    );
    expect(r.trend.map((t) => t.pct)).toEqual([60, 74, 81]);
    expect(r.trend[1].heavilyPaused).toBe(true);
    expect(r.domains["D1"].verdict).toBe("above"); // latest unpaused mock: 9/10
  });
});
