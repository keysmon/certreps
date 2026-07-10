import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PracticeClient } from "./PracticeClient";
import { createAttempt, saveAttempt, recordResult, getAttempt, listInProgress } from "@/lib/storage";
import { getMeta, getBank } from "@/lib/bank";

// useSearchParams is driven per-test through this mutable holder.
let currentParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => currentParams,
}));

// The engine is frozen - stub it so the wrapper's decision (fresh vs resume vs interstitial) is what
// we assert, without mounting the real ExamEngine. data-resume distinguishes a fresh vs adopt mount.
vi.mock("@/components/engine/ExamEngine", () => ({
  ExamEngine: ({ mode, domain, resumeAttemptId }: { mode: string; domain?: string; resumeAttemptId?: string }) => (
    <div data-testid="engine" data-mode={mode} data-domain={domain ?? ""} data-resume={resumeAttemptId ?? ""}>
      engine
    </div>
  ),
}));

const AIP = getMeta().certId; // aip-c01
const IDS = getBank(AIP).slice(0, 5).map((q) => q.id);

function setParams(qs: string) {
  currentParams = new URLSearchParams(qs);
}

/** An unfinished attempt of `mode` (optionally a drill domain) with `answered` recorded results. */
function inProgress(mode: string, answered: number, domain?: string) {
  const a = createAttempt(AIP, mode as never, IDS, domain);
  saveAttempt(a);
  for (let i = 0; i < answered; i++) {
    recordResult(a.attemptId, { questionId: IDS[i], chosen: [0], correct: false, flagged: false });
  }
  return a;
}

beforeEach(() => {
  localStorage.clear();
  setParams("");
});

describe("PracticeClient interstitial", () => {
  it("mounts a fresh engine when nothing is in progress", async () => {
    setParams("mode=mock");
    render(<PracticeClient certId={AIP} />);
    const engine = await screen.findByTestId("engine");
    expect(engine).toHaveAttribute("data-mode", "mock");
    expect(engine).toHaveAttribute("data-resume", ""); // fresh, not an adopt
    expect(screen.queryByText(/in progress/i)).not.toBeInTheDocument();
  });

  it("shows the chooser (not the engine) when a same-mode attempt is unfinished", async () => {
    inProgress("mock", 3);
    setParams("mode=mock");
    render(<PracticeClient certId={AIP} />);
    expect(await screen.findByText(/Full Mock in progress/i)).toBeInTheDocument();
    expect(screen.getByText(/3 of 5 answered/i)).toBeInTheDocument();
    expect(screen.queryByTestId("engine")).not.toBeInTheDocument();
  });

  it("Resume links to the same URL with resume=<id>", async () => {
    const a = inProgress("mock", 2);
    setParams("mode=mock");
    render(<PracticeClient certId={AIP} />);
    const resume = await screen.findByRole("link", { name: /resume/i });
    const href = resume.getAttribute("href") ?? "";
    expect(href).toContain(`/aws/${AIP}/practice`);
    expect(href).toContain("mode=mock");
    expect(href).toContain(`resume=${a.attemptId}`);
  });

  it("an explicit ?resume bypasses the chooser and adopts that id", async () => {
    const a = inProgress("mock", 2);
    setParams(`mode=mock&resume=${a.attemptId}`);
    render(<PracticeClient certId={AIP} />);
    const engine = await screen.findByTestId("engine");
    expect(engine).toHaveAttribute("data-resume", a.attemptId);
    expect(screen.queryByText(/in progress/i)).not.toBeInTheDocument();
  });

  it("Start fresh mounts a fresh engine and leaves the in-progress attempt intact", async () => {
    const a = inProgress("mock", 2);
    setParams("mode=mock");
    render(<PracticeClient certId={AIP} />);
    await screen.findByText(/Full Mock in progress/i);
    await userEvent.click(screen.getByRole("button", { name: /start fresh/i }));
    const engine = await screen.findByTestId("engine");
    expect(engine).toHaveAttribute("data-resume", ""); // fresh mount
    expect(getAttempt(a.attemptId)).not.toBeNull(); // old attempt survives
  });

  it("Discard is a two-step confirm that removes the attempt then starts fresh", async () => {
    const a = inProgress("mock", 2);
    setParams("mode=mock");
    render(<PracticeClient certId={AIP} />);
    await screen.findByText(/Full Mock in progress/i);
    await userEvent.click(screen.getByRole("button", { name: /^discard$/i }));
    await userEvent.click(screen.getByRole("button", { name: /discard this full mock/i }));
    const engine = await screen.findByTestId("engine");
    expect(engine).toHaveAttribute("data-resume", "");
    expect(getAttempt(a.attemptId)).toBeNull(); // discarded
    expect(listInProgress(AIP)).toEqual([]);
  });

  it("matches a drill only on the same domain (different domain -> fresh, no chooser)", async () => {
    inProgress("drill", 4, "Domain 2");
    // Opening a Domain 3 drill must NOT surface the Domain 2 chooser.
    setParams("mode=drill&domain=Domain 3");
    render(<PracticeClient certId={AIP} />);
    const engine = await screen.findByTestId("engine");
    expect(engine).toHaveAttribute("data-domain", "Domain 3");
    expect(screen.queryByText(/in progress/i)).not.toBeInTheDocument();
  });

  it("surfaces the chooser for a drill of the same domain", async () => {
    inProgress("drill", 4, "Domain 2");
    setParams("mode=drill&domain=Domain 2");
    render(<PracticeClient certId={AIP} />);
    expect(await screen.findByText(/Domain Drill in progress/i)).toBeInTheDocument();
    expect(screen.getByText(/Domain 2/)).toBeInTheDocument();
  });

  it("counts only recorded choices as answered - a flagged-unanswered empty row does not inflate it", async () => {
    const a = createAttempt(AIP, "mock", IDS);
    saveAttempt(a);
    recordResult(a.attemptId, { questionId: IDS[0], chosen: [0], correct: false, flagged: false });
    recordResult(a.attemptId, { questionId: IDS[1], chosen: [0], correct: false, flagged: false });
    // A flag on an unanswered question persists as an empty-chosen row (v1h) - it must NOT count.
    recordResult(a.attemptId, { questionId: IDS[2], chosen: [], correct: false, flagged: true });
    setParams("mode=mock");
    render(<PracticeClient certId={AIP} />);
    expect(await screen.findByText(/2 of 5 answered/i)).toBeInTheDocument();
  });
});
