import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResumeBanner } from "./ResumeBanner";
import { createAttempt, saveAttempt, recordResult } from "@/lib/storage";
import { getBank, getMeta } from "@/lib/bank";

beforeEach(() => localStorage.clear());

describe("ResumeBanner", () => {
  it("renders a resume link for the latest local unfinished attempt with mode + count", async () => {
    const questions = getBank().slice(0, 5);
    const ids = questions.map((q) => q.id);
    const a = createAttempt("aip-c01", "mock", ids);
    saveAttempt(a);
    recordResult(a.attemptId, { questionId: ids[0], chosen: [0], correct: false, flagged: false });
    recordResult(a.attemptId, { questionId: ids[1], chosen: [0], correct: false, flagged: false });

    render(<ResumeBanner />);
    expect(await screen.findByText(/in progress/i)).toBeInTheDocument();
    expect(screen.getByText(/2 of 5 answered/i)).toBeInTheDocument();

    const link = screen.getByRole("link", { name: /resume/i });
    const href = link.getAttribute("href") ?? "";
    expect(href).toContain(`/aws/${getMeta().certId}/practice`);
    expect(href).toContain("mode=mock");
    expect(href).toContain(`resume=${a.attemptId}`);
  });

  it("renders nothing when there is no unfinished attempt", () => {
    const { container } = render(<ResumeBanner />);
    expect(container).toBeEmptyDOMElement();
  });
});
