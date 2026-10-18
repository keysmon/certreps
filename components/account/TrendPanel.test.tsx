import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TrendPanel } from "./TrendPanel";
import { getMeta, getPracticeBank } from "@/lib/bank";
import { HEAVY_PAUSE_THRESHOLD } from "@/lib/readiness";
import type { Attempt } from "@/lib/types";

const meta = getMeta();
// Real Domain-1 bank ids: gradeAttempt resolves them so readinessRead yields a real verdict.
const D1_IDS = getPracticeBank().filter((q) => q.tag === "Domain 1").slice(0, 3).map((q) => q.id);

function mock(id: string, startedAt: number, correct: boolean, pauseCount = 0): Attempt {
  const results: Attempt["results"] = {};
  for (const qid of D1_IDS) results[qid] = { questionId: qid, chosen: [], correct, flagged: false };
  return {
    attemptId: id, certId: "aip-c01", mode: "mock", questionIds: D1_IDS, results,
    startedAt, finishedAt: startedAt + 1000, elapsedSec: 300, pauseCount,
  };
}

describe("TrendPanel", () => {
  it("shows a hint and no verdicts with fewer than two finished mocks", () => {
    render(<TrendPanel attempts={[mock("m1", 1000, true)]} meta={meta} />);
    expect(screen.getByText(/take two full mocks/i)).toBeInTheDocument();
    expect(screen.queryByText(/^(above|borderline|weak)$/i)).not.toBeInTheDocument();
  });

  it("renders per-domain verdict words once two mocks are finished", () => {
    render(<TrendPanel attempts={[mock("m1", 1000, true), mock("m2", 2000, true)]} meta={meta} />);
    expect(screen.getByText("above")).toBeInTheDocument();
    expect(screen.queryByText(/take two full mocks/i)).not.toBeInTheDocument();
  });

  it("adds the pause de-emphasis note when a mock in the trend was heavily paused", () => {
    render(
      <TrendPanel
        attempts={[mock("m1", 1000, true), mock("m2", 2000, true, HEAVY_PAUSE_THRESHOLD)]}
        meta={meta}
      />,
    );
    expect(screen.getByText(/de-emphasized/i)).toBeInTheDocument();
  });

  it("excludes study runs (reveal) from the trend - they are not exam-condition mocks", () => {
    const exam = mock("m1", 1000, true);
    const study = { ...mock("m2", 2000, true), reveal: true as const };
    render(<TrendPanel attempts={[exam, study]} meta={meta} />);
    // Only the exam mock counts, so we are below the two-mock threshold: the hint shows and no verdict words render.
    expect(screen.getByText(/take two full mocks/i)).toBeInTheDocument();
    expect(screen.queryByText(/^(above|borderline|weak)$/i)).not.toBeInTheDocument();
  });
});
