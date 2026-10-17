import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExamEngine } from "./ExamEngine";
import { getBank } from "@/lib/bank";
import { getAttempt, listAttempts } from "@/lib/storage";
import { gradeAttempt } from "@/lib/scoring";
import { questionsByIds } from "@/lib/sampler";

beforeEach(() => localStorage.clear());

const optionButtons = () => screen.getAllByRole("button").filter((b) => b.className.includes("option"));

describe("ExamEngine mock navigation (v1h)", () => {
  it("answers stay editable: re-visiting pre-fills the choice and re-submitting overwrites the journal", async () => {
    render(<ExamEngine mode="mock" />);
    const attemptId = listAttempts("aip-c01")[0].attemptId;
    const qid = getAttempt(attemptId)!.questionIds[0];

    // Record a first choice on Q1.
    await userEvent.click(optionButtons()[0]);
    await userEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    const first = getAttempt(attemptId)!.results[qid].chosen;
    expect(first.length).toBeGreaterThan(0);

    // The submit control now reads "Update answer" (a recorded choice exists) - change it.
    await userEvent.click(optionButtons()[1]);
    await userEvent.click(screen.getByRole("button", { name: /update answer/i }));
    const second = getAttempt(attemptId)!.results[qid].chosen;
    expect(second).not.toEqual(first); // journal overwrote with the last choice

    // Navigate away and back: the recorded choice pre-fills (editable), not a blank card.
    await userEvent.click(screen.getByRole("button", { name: /^next$/i }));
    await userEvent.click(screen.getByRole("button", { name: /^prev$/i }));
    expect(optionButtons().some((b) => b.className.includes("selected"))).toBe(true);
    expect(screen.getByRole("button", { name: /update answer/i })).toBeInTheDocument();

    // Final grade reads the LAST choice at finish-time (gradeAttempt derives from stored chosen).
    await userEvent.click(screen.getByRole("button", { name: /review & submit/i }));
    await userEvent.click(screen.getByRole("button", { name: /submit exam/i }));
    const finished = listAttempts("aip-c01")[0];
    expect(finished.results[qid].chosen).toEqual(second);
  });

  it("review screen lists unanswered + flagged with jump links and warns they grade incorrect", async () => {
    render(<ExamEngine mode="mock" />);
    // Answer Q1, then flag Q2 while unanswered.
    await userEvent.click(optionButtons()[0]);
    await userEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    await userEvent.click(screen.getByRole("button", { name: /^next$/i }));
    await userEvent.click(screen.getByRole("button", { name: /flag for review/i }));

    await userEvent.click(screen.getByRole("button", { name: /review & submit/i }));

    // Warning copy states unanswered questions grade wrong.
    expect(screen.getByText(/1 of 75 answered/i)).toBeInTheDocument();
    expect(screen.getByText(/74 unanswered - they grade as incorrect/i)).toBeInTheDocument();
    // Sectioned jump lists.
    expect(screen.getByRole("heading", { name: /unanswered \(74\)/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /flagged for review \(1\)/i })).toBeInTheDocument();

    // The flagged section carries a jump link back to Q2 (labelled unanswered); clicking returns there.
    const flagLink = screen.getByRole("button", { name: /question 2 \(unanswered\)/i });
    await userEvent.click(flagLink);
    expect(screen.getByText(/question 2 of 75/i)).toBeInTheDocument();
  });

  it("submitting with unanswered questions grades them wrong (0 correct on an empty run)", async () => {
    render(<ExamEngine mode="mock" />);
    await userEvent.click(screen.getByRole("button", { name: /review & submit/i }));
    expect(screen.getByText(/75 unanswered - they grade as incorrect/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /submit exam/i }));
    expect(await screen.findByRole("heading", { name: /results/i })).toBeInTheDocument();
    const a = listAttempts("aip-c01")[0];
    const g = gradeAttempt(a, questionsByIds(getBank(), a.questionIds));
    expect(g.score).toBe(0);
  });

  it("a flag on an unanswered question survives resume (empty-chosen row round-trips)", async () => {
    const { unmount } = render(<ExamEngine mode="mock" />);
    // Flag Q1 while unanswered - persists an empty-chosen flagged row.
    await userEvent.click(screen.getByRole("button", { name: /flag for review/i }));
    const attemptId = listAttempts("aip-c01")[0].attemptId;
    const qid = getAttempt(attemptId)!.questionIds[0];
    expect(getAttempt(attemptId)!.results[qid]).toMatchObject({ chosen: [], flagged: true });
    unmount();

    // Resume by explicit id -> the engine adopts the row (no new attempt) and restores the flag.
    render(<ExamEngine mode="mock" resumeAttemptId={attemptId} />);
    expect(listAttempts("aip-c01").length).toBe(1); // C1: adopted, not duplicated
    // Lands on Q1 (first genuinely-unanswered), still unanswered, flag restored (Unflag shown).
    expect(screen.getByText(/question 1 of 75/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^unflag$/i })).toBeInTheDocument();
    expect(screen.queryByText(/answer recorded/i)).not.toBeInTheDocument();
    // The palette confirms flagged-but-unanswered.
    await userEvent.click(screen.getByRole("button", { name: /review & submit/i }));
    const cells = within(screen.getByTestId("reviewmap")).getAllByRole("button");
    expect(cells[0].className).toContain("flagged");
    expect(cells[0].className).not.toContain("answered");
  });
});

describe("ExamEngine practice navigation (redesign)", () => {
  const DOMAIN = "Operational Efficiency & Optimization"; // Domain 4

  it("answering surfaces the sticky verdict + forward action, with no palette and no Prev", async () => {
    render(<ExamEngine mode="drill" domain={DOMAIN} />);
    // The frontier palette is gone: no "Go to question N" cells before OR after answering.
    expect(screen.queryAllByRole("button", { name: /^go to question/i })).toHaveLength(0);

    await userEvent.click(optionButtons()[0]);
    await userEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    expect(document.querySelector(".explain")).not.toBeNull(); // graded (instant feedback)

    // The sticky action bar carries its own verdict. Scope the text query to .pab-verdict - matching
    // /correct|not quite/i unscoped would double-hit QuestionCard's explanation verdict and throw.
    const bar = document.querySelector(".practice-actionbar");
    expect(bar).not.toBeNull();
    expect(within(bar as HTMLElement).getByText(/^correct$|^not quite$/i)).toBeInTheDocument();

    // One forward action, no Prev, and still no palette cells to skip ahead with.
    expect(screen.getByRole("button", { name: /next question/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^prev$/i })).not.toBeInTheDocument();
    expect(screen.queryAllByRole("button", { name: /^go to question/i })).toHaveLength(0);
  });
});
