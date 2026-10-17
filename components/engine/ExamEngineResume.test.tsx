import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExamEngine } from "./ExamEngine";
import { getBank, getMeta } from "@/lib/bank";
import { createAttempt, saveAttempt, recordResult, finishAttempt, getAttempt, listAttempts } from "@/lib/storage";

beforeEach(() => localStorage.clear());

const toSec = (t: string) =>
  t.split(":").reverse().reduce((acc, v, i) => acc + Number(v) * 60 ** i, 0);

// A local, unfinished mock: 5 real bank questions, Q0 + Q1 answered (Q1 flagged), 120s elapsed.
function seedUnfinishedMock(): { id: string; ids: string[] } {
  const questions = getBank().slice(0, 5);
  const ids = questions.map((q) => q.id);
  const a = createAttempt("aip-c01", "mock", ids);
  saveAttempt(a);
  recordResult(a.attemptId, { questionId: ids[0], chosen: questions[0].correct, correct: true, flagged: false });
  recordResult(a.attemptId, { questionId: ids[1], chosen: [0], correct: false, flagged: true });
  // Advance the clock on the still-unfinished attempt (finishAttempt would seal it).
  const stored = getAttempt(a.attemptId)!;
  stored.elapsedSec = 120;
  saveAttempt(stored);
  return { id: a.attemptId, ids };
}

describe("ExamEngine resume-in-progress", () => {
  it("resumes a partially-answered mock: answers, flag, elapsed, position - and never duplicates the attempt (C1)", async () => {
    const { id } = seedUnfinishedMock();
    const budget = getMeta().mockMinutes * 60;
    render(<ExamEngine mode="mock" resumeAttemptId={id} />);

    // Position = first UNANSWERED (Q0 + Q1 answered -> lands on Q3 of the 5 stored questions).
    expect(screen.getByText(/question 3 of 5/i)).toBeInTheDocument();

    // Timer resumed from the stored 120s, NOT reset to the full budget.
    const remaining = toSec(screen.getByRole("timer").textContent ?? "");
    expect(remaining).toBeLessThanOrEqual(budget - 120);
    expect(remaining).toBeGreaterThan(0);

    // Answer the current (Q3) question - this records against the SAME attempt id.
    const opts = screen.getAllByRole("button").filter((b) => b.className.includes("option"));
    await userEvent.click(opts[0]);
    await userEvent.click(screen.getByRole("button", { name: /submit answer/i }));

    // Review map: Q1 + Q2 restored as answered, Q2 still flagged, Q3 now answered.
    await userEvent.click(screen.getByRole("button", { name: /review & submit/i }));
    const cells = within(screen.getByTestId("reviewmap")).getAllByRole("button");
    expect(cells[0].className).toContain("answered");
    expect(cells[1].className).toContain("answered");
    expect(cells[1].className).toContain("flagged");
    expect(cells[2].className).toContain("answered");

    // C1: exactly ONE attempt with the seeded id; results grew 2 -> 3, no second row minted.
    const all = listAttempts("aip-c01");
    expect(all.length).toBe(1);
    expect(all[0].attemptId).toBe(id);
    expect(Object.keys(all[0].results).length).toBe(3);
  });

  it("falls back to a fresh attempt when the resume id is already finished", () => {
    const questions = getBank().slice(0, 5);
    const ids = questions.map((q) => q.id);
    const a = createAttempt("aip-c01", "mock", ids);
    saveAttempt(a);
    recordResult(a.attemptId, { questionId: ids[0], chosen: questions[0].correct, correct: true, flagged: false });
    finishAttempt(a.attemptId, 60, 0);

    render(<ExamEngine mode="mock" resumeAttemptId={a.attemptId} />);

    // Fresh full-length mock sampled; a NEW unfinished row is created alongside the finished seed.
    expect(screen.getByText(/question 1 of 75/i)).toBeInTheDocument();
    const all = listAttempts("aip-c01");
    expect(all.length).toBe(2);
    expect(all.some((x) => x.attemptId !== a.attemptId && x.finishedAt === null)).toBe(true);
  });

  it("falls back to a fresh attempt when the resume id is unknown", () => {
    render(<ExamEngine mode="mock" resumeAttemptId="does-not-exist" />);
    expect(screen.getByText(/question 1 of 75/i)).toBeInTheDocument();
    const all = listAttempts("aip-c01");
    expect(all.length).toBe(1);
    expect(all[0].finishedAt).toBeNull();
  });

  it("persists the running clock mid-exam so a resume restores an honest elapsed (engine-driven, not seeded)", () => {
    // Drive the REAL engine clock (fake timers) and assert the stored attempt's elapsedSec advances
    // past 0 - the value the engine itself produces, closing the gap that seeded-storage tests miss.
    vi.useFakeTimers();
    try {
      render(<ExamEngine mode="mock" />);
      act(() => vi.advanceTimersByTime(11_000)); // past one 10s persist interval
      const a = listAttempts("aip-c01")[0];
      expect(a.elapsedSec).toBeGreaterThan(0);
      expect(a.finishedAt).toBeNull(); // persisted without sealing the attempt
    } finally {
      vi.useRealTimers();
    }
  });

  it("falls back to fresh when the resume attempt mode does not match the engine mode", () => {
    const a = createAttempt("aip-c01", "quick", getBank().slice(0, 3).map((q) => q.id));
    saveAttempt(a);
    // Engine is mock, stored attempt is quick -> mode mismatch -> fresh sample, new row.
    render(<ExamEngine mode="mock" resumeAttemptId={a.attemptId} />);
    expect(screen.getByText(/question 1 of 75/i)).toBeInTheDocument();
    expect(listAttempts("aip-c01").length).toBe(2);
  });
});
