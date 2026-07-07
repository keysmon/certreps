import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReviewPastClient } from "./ReviewPastClient";
import { createAttempt, saveAttempt, recordResult, finishAttempt } from "@/lib/storage";
import { getBank, getMeta } from "@/lib/bank";

beforeEach(() => localStorage.clear());

// Seed against real bank questions so the resolved Results surface grades exactly as production.
function seedFinished(): string {
  const questions = getBank().slice(0, 5);
  const ids = questions.map((q) => q.id);
  const a = createAttempt("aip-c01", "quick", ids);
  saveAttempt(a);
  for (const q of questions) {
    recordResult(a.attemptId, { questionId: q.id, chosen: q.correct, correct: true, flagged: false });
  }
  finishAttempt(a.attemptId, 200, 0);
  return a.attemptId;
}

describe("ReviewPastClient", () => {
  it("replays a finished attempt through the Results surface", async () => {
    const id = seedFinished();
    render(<ReviewPastClient id={id} />);
    // Results-only landmarks: the per-domain breakdown heading and the recap section.
    expect(await screen.findByText(/performance by domain/i)).toBeInTheDocument();
    expect(screen.getByText(/question recap/i)).toBeInTheDocument();
  });

  it("shows a not-on-this-device card with an account link for an unknown id", async () => {
    render(<ReviewPastClient id="does-not-exist" />);
    expect(await screen.findByText(/not on this device/i)).toBeInTheDocument();
    const accountLink = screen.getByRole("link", { name: /your account/i });
    expect(accountLink).toHaveAttribute("href", "/account");
    // The cert-page escape hatch is present and points at the cert overview.
    expect(screen.getByRole("link", { name: new RegExp(getMeta().examCode, "i") })).toHaveAttribute(
      "href",
      `/aws/${getMeta().certId}`
    );
  });

  it("shows an in-progress card for an unfinished attempt", async () => {
    const a = createAttempt("aip-c01", "mock", getBank().slice(0, 3).map((q) => q.id));
    saveAttempt(a);
    render(<ReviewPastClient id={a.attemptId} />);
    expect(await screen.findByText(/still in progress/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /account/i })).toHaveAttribute("href", "/account");
  });
});
