import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AttemptsList } from "./AttemptsList";
import { getMeta, getBank, getPracticeBank } from "@/lib/bank";
import type { Attempt } from "@/lib/types";

const meta = getMeta();

// Fixtures reference real bank ids so gradeAttempt resolves them and scores honestly.
function attempt(over: Partial<Attempt>): Attempt {
  return {
    attemptId: "a1", certId: "aip-c01", mode: "quick", questionIds: [], results: {},
    startedAt: 1_700_000_000_000, finishedAt: null, elapsedSec: 0, pauseCount: 0, ...over,
  };
}

describe("AttemptsList", () => {
  it("shows an empty state with a link to start practicing when there is no history", () => {
    render(<AttemptsList attempts={[]} meta={meta} />);
    expect(screen.getByText(/no practice history yet/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /start practicing/i })).toBeInTheDocument();
  });

  it("renders a finished attempt with its score, linking to the attempt detail page", () => {
    const a = attempt({
      attemptId: "att-fin",
      mode: "mock",
      finishedAt: 1_700_000_100_000,
      questionIds: ["aipc01-0001", "aipc01-0002"],
      results: {
        "aipc01-0001": { questionId: "aipc01-0001", chosen: [1], correct: true, flagged: false },
        "aipc01-0002": { questionId: "aipc01-0002", chosen: [3], correct: true, flagged: false },
      },
    });
    render(<AttemptsList attempts={[a]} meta={meta} />);
    expect(screen.getByText("100%")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /100%/i });
    expect(link).toHaveAttribute("href", "/account/attempts/att-fin");
  });

  it("marks an unfinished attempt as in progress and does not link it", () => {
    const a = attempt({ attemptId: "att-open", mode: "mock", finishedAt: null, questionIds: [getPracticeBank()[0].id] });
    render(<AttemptsList attempts={[a]} meta={meta} />);
    expect(screen.getByText(/in progress/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /in progress/i })).not.toBeInTheDocument();
  });
});


it("labels archived unfinished history honestly without removing it", () => {
  const archived = getBank().find((q) => q.excludedFromPractice)!;
  render(<AttemptsList attempts={[attempt({ attemptId: "archived", questionIds: [archived.id] })]} meta={meta} />);
  expect(screen.getByText(/fresh practice required/i)).toBeInTheDocument();
  expect(screen.queryByText(/^in progress$/i)).not.toBeInTheDocument();
});

it("keeps finished archived scores reviewable and distinguishes their question set", () => {
  const archived = getBank().find((q) => q.excludedFromPractice)!;
  const a = attempt({ attemptId: "archived-finished", questionIds: [archived.id], finishedAt: 10, results: { [archived.id]: { questionId: archived.id, chosen: archived.correct, correct: true, flagged: false } } });
  render(<AttemptsList attempts={[a]} meta={meta} />);
  expect(screen.getByText(/archived question set/i)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /100%/ })).toHaveAttribute("href", "/account/attempts/archived-finished");
});
