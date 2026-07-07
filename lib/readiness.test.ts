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
  it("skips latest heavily paused mock for verdict and uses second-latest clean mock", () => {
    const r = readinessRead(
      [
        mock("1", 70, 0, { D1: { correct: 7, total: 10 } }),
        mock("2", 72, 0, { D1: { correct: 8, total: 10 } }),
        mock("3", 75, HEAVY_PAUSE_THRESHOLD, { D1: { correct: 5, total: 10 } }),
      ],
      75
    );
    expect(r.trend.map((t) => t.pct)).toEqual([70, 72, 75]);
    expect(r.trend[2].heavilyPaused).toBe(true);
    expect(r.domains["D1"].pct).toBe(80); // from mock 2: 8/10, not mock 3's 5/10
    expect(r.domains["D1"].verdict).toBe("above");
  });
  it("falls back to most recent mock when all are heavily paused", () => {
    const r = readinessRead(
      [
        mock("1", 65, HEAVY_PAUSE_THRESHOLD, { D1: { correct: 6, total: 10 } }),
        mock("2", 70, HEAVY_PAUSE_THRESHOLD, { D1: { correct: 7, total: 10 } }),
        mock("3", 75, HEAVY_PAUSE_THRESHOLD, { D1: { correct: 8, total: 10 } }),
      ],
      75
    );
    expect(r.trend.length).toBe(3);
    expect(r.trend.every((t) => t.heavilyPaused)).toBe(true);
    expect(r.domains["D1"].pct).toBe(80); // from most recent (mock 3): 8/10
    expect(r.domains["D1"].verdict).toBe("above");
  });
});
