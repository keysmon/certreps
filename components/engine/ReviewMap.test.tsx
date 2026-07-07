import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReviewMap } from "./ReviewMap";

describe("ReviewMap", () => {
  const states = [
    { answered: true, flagged: false },
    { answered: false, flagged: true },
    { answered: false, flagged: false },
  ];
  it("renders one cell per question with state classes and jumps on click", async () => {
    const onJump = vi.fn();
    render(<ReviewMap states={states} current={0} onJump={onJump} />);
    const cells = screen.getAllByRole("button");
    expect(cells.length).toBe(3);
    expect(cells[0].className).toContain("answered");
    expect(cells[1].className).toContain("flagged");
    await userEvent.click(cells[2]);
    expect(onJump).toHaveBeenCalledWith(2);
  });
  it("summarizes unanswered count", () => {
    render(<ReviewMap states={states} current={0} onJump={() => {}} />);
    expect(screen.getByText(/2 unanswered/i)).toBeInTheDocument();
  });
});
