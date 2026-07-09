import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Results } from "./Results";
import { getMeta } from "@/lib/bank";
import { HEAVY_PAUSE_THRESHOLD } from "@/lib/readiness";
import type { Attempt, Question } from "@/lib/types";

beforeEach(() => localStorage.clear());

const qs: Question[] = [0, 1, 2, 3].map((i) => ({
  id: `q${i}`, domain: getMeta().domains[i % 2].name, tag: `Domain ${(i % 2) + 1}`, type: "single",
  stem: `Stem number ${i}`, options: ["alpha opt", "beta opt", "gamma opt", "delta opt"], correct: [0],
  explanation: `<b>Explanation ${i}</b> covers the concept`, difficulty: "medium",
  docUrl: `https://docs.aws.amazon.com/x${i}`,
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

describe("Results recap explanations", () => {
  it("collapses correct rows but auto-opens wrong ones so a miss is not buried", () => {
    // q0 is correct -> stays collapsed; q1 is wrong -> opens by default (Task 7 additive `open`).
    render(<Results attempt={makeAttempt(0)} questions={qs} meta={getMeta()} />);
    expect(screen.getByText(/Explanation 0/)).not.toBeVisible();
    expect(screen.getByText(/Explanation 1/)).toBeVisible();
  });

  it("expanding a recap row reveals its explanation and the AWS docs link", async () => {
    const user = userEvent.setup();
    render(<Results attempt={makeAttempt(0)} questions={qs} meta={getMeta()} />);
    const summary = screen.getByText(/Stem number 0/).closest("summary") as HTMLElement;
    await user.click(summary);
    const details = summary.closest("details") as HTMLElement;
    expect(within(details).getByText(/Explanation 0/)).toBeVisible();
    const doclink = within(details).getByRole("link", { name: /read the aws docs/i });
    expect(doclink).toBeVisible();
    expect(doclink).toHaveAttribute("href", "https://docs.aws.amazon.com/x0");
  });

  it("marks the correct option emerald and a wrongly-chosen option rose in an expanded row", async () => {
    const user = userEvent.setup();
    render(<Results attempt={makeAttempt(0)} questions={qs} meta={getMeta()} />);
    // q1: correct=[0] ("alpha opt"), user chose [1] ("beta opt") - a wrong pick.
    const summary = screen.getByText(/Stem number 1/).closest("summary") as HTMLElement;
    await user.click(summary);
    const details = summary.closest("details") as HTMLElement;
    const correctOpt = within(details).getByText("alpha opt").closest(".option") as HTMLElement;
    expect(correctOpt).toHaveClass("correct");
    const wrongOpt = within(details).getByText("beta opt").closest(".option") as HTMLElement;
    expect(wrongOpt).toHaveClass("incorrect");
  });
});
