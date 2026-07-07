import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExamEngine } from "./ExamEngine";
import { listAttempts } from "@/lib/storage";

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
