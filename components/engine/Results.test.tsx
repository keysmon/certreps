import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Results } from "./Results";
import { getMeta } from "@/lib/bank";
import { HEAVY_PAUSE_THRESHOLD } from "@/lib/readiness";
import type { Attempt, Question } from "@/lib/types";

beforeEach(() => localStorage.clear());

const qs: Question[] = [0, 1, 2, 3].map((i) => ({
  id: `q${i}`, domain: getMeta().domains[i % 2].name, tag: `Domain ${(i % 2) + 1}`, type: "single",
  stem: `Stem number ${i}`, options: ["alpha opt", "beta opt", "gamma opt", "delta opt"], correct: [0], explanation: "x", difficulty: "medium",
  docUrl: "https://docs.aws.amazon.com/x",
}));

function makeAttempt(pauseCount: number): Attempt {
  return {
    attemptId: "t1", certId: "aip-c01", mode: "mock", questionIds: qs.map((q) => q.id),
    results: {
      q0: { questionId: "q0", chosen: [0], correct: true, flagged: false },
      q1: { questionId: "q1", chosen: [1], correct: false, flagged: true },
      q2: { questionId: "q2", chosen: [0], correct: true, flagged: false },
      q3: { questionId: "q3", chosen: [2], correct: false, flagged: false },
    },
    startedAt: 1, finishedAt: 2, elapsedSec: 400, pauseCount,
  };
}

describe("Results", () => {
  it("shows score, per-domain rows, and question recap", () => {
    render(<Results attempt={makeAttempt(0)} questions={qs} meta={getMeta()} />);
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText(/2 \/ 4 correct/i)).toBeInTheDocument();
    expect(screen.getByText(/performance by domain/i)).toBeInTheDocument();
    expect(screen.getByText(/question recap/i)).toBeInTheDocument();
    expect(screen.queryByText(/paused/i)).not.toBeInTheDocument();
  });
  it("shows the honesty stamp when heavily paused", () => {
    render(<Results attempt={makeAttempt(HEAVY_PAUSE_THRESHOLD)} questions={qs} meta={getMeta()} />);
    expect(screen.getByText(new RegExp(`paused ${HEAVY_PAUSE_THRESHOLD}x - timing may not reflect exam conditions`, "i"))).toBeInTheDocument();
  });
  it("shows a plain pause stamp below the heavy threshold, without the warning clause", () => {
    render(<Results attempt={makeAttempt(HEAVY_PAUSE_THRESHOLD - 1)} questions={qs} meta={getMeta()} />);
    expect(screen.getByText(new RegExp(`paused ${HEAVY_PAUSE_THRESHOLD - 1}x`, "i"))).toBeInTheDocument();
    expect(screen.queryByText(/timing may not reflect exam conditions/i)).not.toBeInTheDocument();
  });
});
