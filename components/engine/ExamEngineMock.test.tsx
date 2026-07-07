import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExamEngine } from "./ExamEngine";
import { listAttempts } from "@/lib/storage";

beforeEach(() => localStorage.clear());

describe("ExamEngine mock mode", () => {
  it("gives no feedback mid-exam, supports flag + skip + jump, submits from review screen", async () => {
    render(<ExamEngine mode="mock" />);
    // Answer Q1 - no correctness feedback should appear
    const opts = screen.getAllByRole("button").filter((b) => b.className.includes("option"));
    await userEvent.click(opts[0]);
    await userEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    // Deviation D1 (pre-authorized): structural check for the feedback UI instead of queryByText
    // (/correct|not quite/i collides with stem/option copy AND queryByText throws on multi-match).
    // The feedback UI is exactly the .explain block.
    expect(document.querySelector(".explain")).toBeNull();
    // Deviation D2 (approved): flag Q1 while it IS answered so the flag persists to storage.
    // Guarded toggleFlag re-records only when an answer exists; the plan-shipped assertion targeted
    // a flagged-but-unanswered Q2 whose flag never reaches storage (undefined.flagged throws). Q2
    // below stays flagged-unanswered to prove the in-memory UI path via the review map (cells[1]).
    await userEvent.click(screen.getByRole("button", { name: /flag for review/i }));
    // Move to Q2, flag it (unanswered -> in-memory only), skip forward
    await userEvent.click(screen.getByRole("button", { name: /^next$/i }));
    await userEvent.click(screen.getByRole("button", { name: /flag for review/i }));
    await userEvent.click(screen.getByRole("button", { name: /^next$/i }));
    // Open review screen
    await userEvent.click(screen.getByRole("button", { name: /review & submit/i }));
    const map = screen.getByTestId("reviewmap");
    const cells = within(map).getAllByRole("button");
    expect(cells.length).toBe(65);
    expect(cells[0].className).toContain("answered");
    expect(cells[1].className).toContain("flagged");
    // Jump back to Q2 from the map
    await userEvent.click(cells[1]);
    expect(screen.getByText(/question 2 of 65/i)).toBeInTheDocument();
    // Return to review and submit the exam
    await userEvent.click(screen.getByRole("button", { name: /review & submit/i }));
    await userEvent.click(screen.getByRole("button", { name: /submit exam/i }));
    expect(await screen.findByText(/results/i)).toBeInTheDocument();
    const a = listAttempts("aip-c01")[0];
    expect(a.mode).toBe("mock");
    expect(a.finishedAt).not.toBeNull();
    expect(a.results[a.questionIds[0]].flagged).toBe(true);
  });
});
