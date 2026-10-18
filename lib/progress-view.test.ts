import { beforeEach, describe, expect, it } from "vitest";
import { progressView, domainReadiness, domainPracticeProgress } from "./progress-view";
import { getPracticeBank as getBank } from "./bank";
import { writeAll } from "./storage";
import type { Attempt, QuestionResult } from "./types";

// Seed the same way the Catalog tests do: real bank ids so grading is honest.
const AIP = "aip-c01"; // passLine 75
const MLA = "mla-c01"; // passLine 72

function attempt(over: Partial<Attempt>): Attempt {
  return {
    attemptId: `a-${Math.random().toString(36).slice(2)}`,
    certId: AIP,
    mode: "mock",
    questionIds: [],
    results: {},
    startedAt: 1_700_000_000_000,
    finishedAt: null,
    elapsedSec: 0,
    pauseCount: 0,
    ...over,
  };
}

/** A finished mock over `n` bank questions with the first `right` graded correct. */
function gradedMock(certId: string, n: number, right: number, over: Partial<Attempt> = {}): Attempt {
  const ids = getBank(certId).slice(0, n).map((q) => q.id);
  const results: Record<string, QuestionResult> = {};
  ids.forEach((id, i) => {
    results[id] = { questionId: id, chosen: [], correct: i < right, flagged: false };
  });
  return attempt({ certId, mode: "mock", questionIds: ids, results, finishedAt: 1_700_000_100_000, ...over });
}

beforeEach(() => localStorage.clear());

describe("progressView", () => {
  it("returns Not started at 0% when there is no history", () => {
    expect(progressView(AIP, 75)).toEqual({ bestMockPct: 0, status: "Not started" });
  });

  it("reads an unfinished attempt as In progress over a 0% bar", () => {
    writeAll([attempt({ certId: AIP, finishedAt: null })]);
    expect(progressView(AIP, 75)).toEqual({ bestMockPct: 0, status: "In progress" });
  });

  // User-reported regression (2026-07-10): a FINISHED drill flipped the cert back to
  // "Not started" because only unfinished attempts and finished mocks were counted.
  it("reads a finished drill as In progress over a 0% bar (mock-fed bar untouched)", () => {
    writeAll([attempt({ certId: AIP, mode: "drill", finishedAt: 1_700_000_100_000 })]);
    expect(progressView(AIP, 75)).toEqual({ bestMockPct: 0, status: "In progress" });
  });

  it("reads a finished quick session as In progress", () => {
    writeAll([attempt({ certId: AIP, mode: "quick", finishedAt: 1_700_000_100_000 })]);
    expect(progressView(AIP, 75).status).toBe("In progress");
  });

  it("takes the best finished mock as the bar and reads below-pass as In progress", () => {
    // 10/20 = 50% and 14/20 = 70%; best is 70, under the 75 pass line.
    writeAll([gradedMock(AIP, 20, 10), gradedMock(AIP, 20, 14)]);
    expect(progressView(AIP, 75)).toEqual({ bestMockPct: 70, status: "In progress" });
  });

  it("reads Ready (checked first) once best finished mock meets the pass line", () => {
    // 15/20 = 75% == pass line; an extra unfinished attempt must not downgrade it.
    writeAll([gradedMock(AIP, 20, 15), attempt({ certId: AIP, finishedAt: null })]);
    expect(progressView(AIP, 75)).toEqual({ bestMockPct: 75, status: "Ready" });
  });

  it("scopes to the requested cert only", () => {
    writeAll([gradedMock(MLA, 20, 20)]);
    expect(progressView(AIP, 75)).toEqual({ bestMockPct: 0, status: "Not started" });
    expect(progressView(MLA, 72).status).toBe("Ready");
  });

  it("excludes a study run (reveal) from the mock-fed bar", () => {
    // A 100% study run must NOT set the readiness bar; only the 70% exam mock counts.
    writeAll([gradedMock(AIP, 20, 20, { reveal: true }), gradedMock(AIP, 20, 14)]);
    expect(progressView(AIP, 75)).toEqual({ bestMockPct: 70, status: "In progress" });
  });

  it("reads a lone finished study run as In progress over a 0% bar", () => {
    writeAll([gradedMock(AIP, 20, 20, { reveal: true })]);
    expect(progressView(AIP, 75)).toEqual({ bestMockPct: 0, status: "In progress" });
  });
});

describe("domainReadiness", () => {
  it("is empty with no finished mock", () => {
    expect(domainReadiness(AIP, 75).domains).toEqual({});
    expect(domainReadiness(AIP, 75).trend).toEqual([]);
  });

  it("bands the finished mock's per-domain accuracy against the pass line (C10)", () => {
    // Grade the first domain's questions all correct; the domain read is 'above'.
    const bank = getBank(AIP);
    const firstDomain = bank[0].domain;
    const ids = bank.filter((q) => q.domain === firstDomain).slice(0, 6).map((q) => q.id);
    const results: Record<string, QuestionResult> = {};
    for (const id of ids) results[id] = { questionId: id, chosen: [], correct: true, flagged: false };
    writeAll([attempt({ certId: AIP, mode: "mock", questionIds: ids, results, finishedAt: 1_700_000_100_000 })]);

    const read = domainReadiness(AIP, 75);
    expect(read.domains[firstDomain]).toEqual({ pct: 100, verdict: "above" });
  });

  it("ignores a study run when reading per-domain verdicts", () => {
    const bank = getBank(AIP);
    const firstDomain = bank[0].domain;
    const ids = bank.filter((q) => q.domain === firstDomain).slice(0, 6).map((q) => q.id);
    const results: Record<string, QuestionResult> = {};
    for (const id of ids) results[id] = { questionId: id, chosen: [], correct: true, flagged: false };
    // Only a study run exists -> no exam mock -> empty domain read.
    writeAll([attempt({ certId: AIP, mode: "mock", questionIds: ids, results, finishedAt: 1_700_000_100_000, reveal: true })]);
    expect(domainReadiness(AIP, 75).domains).toEqual({});
  });
});


it("does not count archived question scores towards current readiness", () => {
  const old = gradedMock(AIP, 1, 1, { questionIds: ["aipc01-0001"], results: {
    "aipc01-0001": { questionId: "aipc01-0001", chosen: [], correct: true, flagged: false },
  } });
  writeAll([old]);
  expect(progressView(AIP, 75)).toEqual({ bestMockPct: 0, status: "In progress" });
});


describe("domain practice history", () => {
  it("counts completed drills separately for each cert and domain, retaining archived effort", () => {
    const domain = getBank(AIP)[0].domain;
    writeAll([
      attempt({ mode: "drill", domain, questionIds: ["aipc01-0001"], finishedAt: 10 }),
      attempt({ mode: "drill", domain, finishedAt: 20 }),
      attempt({ mode: "drill", domain }),
      attempt({ mode: "quick", domain, finishedAt: 30 }),
      attempt({ certId: MLA, mode: "drill", domain, finishedAt: 40 }),
    ]);
    expect(domainPracticeProgress(AIP)[domain]).toEqual({ completedDrills: 2 });
    expect(domainReadiness(AIP, 75).domains).toEqual({});
  });
});
