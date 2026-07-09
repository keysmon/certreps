import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuestionCard } from "./QuestionCard";
import type { Question } from "@/lib/types";

const single: Question = {
  id: "q1", domain: "D1", tag: "Domain 1", type: "single",
  stem: "Which service?", options: ["A opt", "B opt", "C opt", "D opt"],
  correct: [2], explanation: "Because <b>C</b>.", difficulty: "medium",
  docUrl: "https://docs.aws.amazon.com/bedrock/",
};
const multi: Question = { ...single, id: "q2", type: "multi", options: ["A opt", "B opt", "C opt", "D opt", "E opt"], correct: [0, 2] };

// Options now render in an attempt-seeded shuffle (view layer). Clicks/onSubmit stay CANONICAL, so
// these assertions are unchanged - they select options by TEXT and assert canonical indices. This
// specific id is chosen deliberately: optionPermutation("shuffled-attempt", "q1"/"q2", ...) produces
// a NON-identity order that relocates the asserted indices (canonical 2 for q1; 0 and 2 for q2), so
// an inverted view->canonical click handler would make both tests fail instead of false-pass.
const SHUFFLE_ID = "shuffled-attempt";

describe("QuestionCard", () => {
  it("selecting an option enables submit; submit reports chosen indices", async () => {
    const onSubmit = vi.fn();
    render(<QuestionCard question={single} graded={null} onSubmit={onSubmit} attemptId={SHUFFLE_ID} />);
    const submit = screen.getByRole("button", { name: /submit/i });
    expect(submit).toBeDisabled();
    await userEvent.click(screen.getByText("C opt"));
    expect(submit).toBeEnabled();
    await userEvent.click(submit);
    expect(onSubmit).toHaveBeenCalledWith([2]);
  });
  it("multi allows max two selections", async () => {
    const onSubmit = vi.fn();
    render(<QuestionCard question={multi} graded={null} onSubmit={onSubmit} attemptId={SHUFFLE_ID} />);
    await userEvent.click(screen.getByText("A opt"));
    await userEvent.click(screen.getByText("C opt"));
    await userEvent.click(screen.getByText("E opt")); // third click ignored
    await userEvent.click(screen.getByRole("button", { name: /submit/i }));
    expect(onSubmit).toHaveBeenCalledWith([0, 2]);
  });
  it("graded state shows explanation and doc link, hides submit", () => {
    render(<QuestionCard question={single} graded={{ chosen: [1], correct: false }} onSubmit={() => {}} attemptId={SHUFFLE_ID} />);
    expect(screen.getByText(/not quite/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /aws docs/i })).toHaveAttribute("href", single.docUrl);
    expect(screen.queryByRole("button", { name: /submit/i })).not.toBeInTheDocument();
  });
});
