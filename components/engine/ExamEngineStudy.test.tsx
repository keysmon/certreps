import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExamEngine } from "./ExamEngine";
import { getBank } from "@/lib/bank";
import { createAttempt, saveAttempt, recordResult, getAttempt, listAttempts } from "@/lib/storage";

beforeEach(() => localStorage.clear());

describe("ExamEngine study mock (reveal)", () => {
  it("reveals and locks each answer on submit, runs untimed, and saves reveal:true", async () => {
    render(<ExamEngine mode="mock" reveal />);
    // Study mode is untimed: no countdown timer is shown (exam mock shows one).
    expect(screen.queryByRole("timer")).toBeNull();

    const opts = screen.getAllByRole("button").filter((b) => b.className.includes("option"));
    await userEvent.click(opts[0]);
    await userEvent.click(screen.getByRole("button", { name: /submit answer/i }));

    // Reveal: the .explain feedback block appears (it is null for the exam mock).
    expect(document.querySelector(".explain")).not.toBeNull();
    // Lock: options are disabled after reveal (no re-answering).
    const gradedOpts = screen.getAllByRole("button").filter((b) => b.className.includes("option"));
    expect(gradedOpts.length).toBeGreaterThan(0);
    expect(gradedOpts.every((b) => (b as HTMLButtonElement).disabled)).toBe(true);
    // The recorded attempt is a study run.
    expect(listAttempts("aip-c01")[0].reveal).toBe(true);
  });

  it("resume re-reveals an already-answered question and stays untimed", async () => {
    // Seed a 5-question study mock with Q0 answered (correct).
    const questions = getBank().slice(0, 5);
    const ids = questions.map((q) => q.id);
    const a = createAttempt("aip-c01", "mock", ids, undefined, true);
    saveAttempt(a);
    recordResult(a.attemptId, { questionId: ids[0], chosen: questions[0].correct, correct: true, flagged: false });

    render(<ExamEngine mode="mock" reveal resumeAttemptId={a.attemptId} />);
    // Lands on the first UNANSWERED question (Q2 of 5); still untimed.
    expect(screen.getByText(/question 2 of 5/i)).toBeInTheDocument();
    expect(screen.queryByRole("timer")).toBeNull();
    // Navigate back to the answered Q1 -> it comes back REVEALED (graded), not a blank card.
    await userEvent.click(screen.getByRole("button", { name: /^prev$/i }));
    expect(screen.getByText(/question 1 of 5/i)).toBeInTheDocument();
    expect(document.querySelector(".explain")).not.toBeNull();
    // Attempt id preserved (C1: resume adopts, never mints a second row).
    expect(getAttempt(a.attemptId)).not.toBeNull();
    expect(listAttempts("aip-c01").length).toBe(1);
  });
});
