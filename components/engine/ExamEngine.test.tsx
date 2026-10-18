import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExamEngine } from "./ExamEngine";
import { listAttempts, saveAttempt, createAttempt } from "@/lib/storage";

beforeEach(() => localStorage.clear());

describe("ExamEngine quick mode", () => {
  it("runs the immediate-feedback loop and persists the attempt", async () => {
    render(<ExamEngine mode="quick" />);
    for (let i = 0; i < 10; i++) {
      const optionButtons = screen.getAllByRole("button").filter((b) => b.className.includes("option"));
      await userEvent.click(optionButtons[0]);
      await userEvent.click(screen.getByRole("button", { name: /submit answer/i }));
      // getAllByText (mirrors drill mode's idiom below): the verdict <p> AND the explanation <p>
      // both match /correct/i for questions whose explanation copy contains "correct" - getByText
      // would throw on that double-match ~1-in-4 runs. length>0 keeps the intent (feedback visible)
      // while staying deterministic. Deviation from the authoritative snippet - see report.
      expect(screen.getAllByText(/correct|not quite/i).length).toBeGreaterThan(0);
      await userEvent.click(screen.getByRole("button", { name: i < 9 ? /next question/i : /see results/i }));
    }
    expect(screen.getByRole("heading", { name: /results/i })).toBeInTheDocument();
    const attempts = listAttempts("aip-c01");
    expect(attempts.length).toBe(1);
    expect(attempts[0].finishedAt).not.toBeNull();
    expect(Object.keys(attempts[0].results).length).toBe(10);
  });
});

describe("ExamEngine drill mode", () => {
  it("serves only the selected domain", async () => {
    const domain = "Operational Efficiency & Optimization";
    render(<ExamEngine mode="drill" domain={domain} />);
    expect(screen.getAllByText("Domain 4").length).toBeGreaterThan(0);
  });
});

describe("ExamEngine retry mode", () => {
  it("shows empty state when there are no missed questions", () => {
    render(<ExamEngine mode="retry" />);
    expect(screen.getByText(/no missed questions yet/i)).toBeInTheDocument();
  });
});

describe("session-scoped retries", () => {
  it("retries only this finished session's incorrect and unanswered active questions", async () => {
    const { getPracticeBank } = await import("@/lib/bank");
    const bank = getPracticeBank();
    const old = createAttempt("aip-c01", "quick", [bank[3].id]);
    old.finishedAt = 1;
    old.results[bank[3].id] = { questionId: bank[3].id, chosen: [0], correct: false, flagged: false };
    saveAttempt(old);
    const source = createAttempt("aip-c01", "mock", bank.slice(0, 3).map(q => q.id));
    source.finishedAt = 2;
    source.results[bank[0].id] = { questionId: bank[0].id, chosen: [0], correct: false, flagged: false };
    source.results[bank[1].id] = { questionId: bank[1].id, chosen: [0], correct: true, flagged: false };
    saveAttempt(source);
    render(<ExamEngine mode="retry" retryFrom={source.attemptId} />);
    const retry = listAttempts("aip-c01").find(a => a.mode === "retry");
    expect(retry?.questionIds).toEqual([bank[0].id, bank[2].id]);
  });

  it("never falls back to unrelated history when the source session is missing", () => {
    render(<ExamEngine mode="retry" retryFrom="missing" />);
    expect(screen.getByText(/session is not available/i)).toBeInTheDocument();
    expect(listAttempts("aip-c01")).toHaveLength(0);
  });
});

it.each(["unfinished", "wrong-cert", "archived"])("does not retry an ineligible source: %s", async (kind) => {
  const { getBank, getPracticeBank } = await import("@/lib/bank");
  const q = kind === "archived" ? getBank().find(q => q.excludedFromPractice)! : getPracticeBank()[0];
  const source = createAttempt(kind === "wrong-cert" ? "aif-c01" : "aip-c01", "quick", [q.id]);
  if (kind !== "unfinished") source.finishedAt = 1;
  source.results[q.id] = { questionId: q.id, chosen: [0], correct: false, flagged: false };
  saveAttempt(source);
  render(<ExamEngine mode="retry" retryFrom={source.attemptId} />);
  expect(listAttempts("aip-c01").filter(a => a.mode === "retry")).toHaveLength(0);
  expect(screen.getByText(kind === "archived" ? /no active missed questions remain/i : /session is not available/i)).toBeInTheDocument();
});
