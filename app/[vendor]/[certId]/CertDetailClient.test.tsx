import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PathToReady, DomainRows, ReadinessPanel } from "./CertDetailClient";
import { createAttempt, saveAttempt, recordResult, writeAll } from "@/lib/storage";
import { getPracticeBank as getBank } from "@/lib/bank";
import type { Attempt, QuestionResult } from "@/lib/types";

const AIP = "aip-c01"; // passLine 75

function attempt(over: Partial<Attempt>): Attempt {
  return {
    attemptId: `a-${Math.random().toString(36).slice(2)}`,
    certId: AIP,
    mode: "mock",
    questionIds: [],
    results: {},
    startedAt: 1_700_000_000_000,
    finishedAt: null,
    elapsedSec: 0,
    pauseCount: 0,
    ...over,
  };
}

/** A finished mock over `n` bank questions, first `right` correct. */
function gradedMock(n: number, right: number): Attempt {
  const ids = getBank(AIP).slice(0, n).map((q) => q.id);
  const results: Record<string, QuestionResult> = {};
  ids.forEach((id, i) => {
    results[id] = { questionId: id, chosen: [], correct: i < right, flagged: false };
  });
  return attempt({ mode: "mock", questionIds: ids, results, finishedAt: 1_700_000_100_000 });
}

beforeEach(() => localStorage.clear());

describe("PathToReady", () => {
  const DOMAINS = [{ name: "Foundation Model Integration & Compliance", weightPct: 31 }];
  const renderPath = () =>
    render(
      <PathToReady
        certId={AIP}
        vendorSlug="aws"
        mockMinutes={156}
        mockQuestionCount={65}
        passLinePct={75}
        domains={DOMAINS}
      />,
    );

  it("Step 1 primary -> quick practice, Step 2 -> the full mock, and no legacy quick-drill ghost", () => {
    renderPath();
    expect(screen.getByRole("link", { name: /start practicing/i })).toHaveAttribute(
      "href",
      `/aws/${AIP}/practice?mode=quick`,
    );
    expect(screen.getByRole("link", { name: /take the full mock/i })).toHaveAttribute(
      "href",
      `/aws/${AIP}/practice?mode=mock`,
    );
    // The old separate "Quick 10-Q drill" ghost is gone in the redesign.
    expect(screen.queryByRole("link", { name: /quick 10-q drill/i })).not.toBeInTheDocument();
    // No resume-info line when nothing is in progress.
    expect(screen.queryByText(/in progress/i)).not.toBeInTheDocument();
  });

  it("hides the per-domain drills until the toggle is expanded (progressive disclosure)", async () => {
    const user = userEvent.setup();
    renderPath();
    expect(screen.queryByRole("link", { name: /Drill Foundation Model Integration/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /pick a specific domain/i }));
    expect(await screen.findByRole("link", { name: /Drill Foundation Model Integration/i })).toHaveAttribute(
      "href",
      `/aws/${AIP}/practice?mode=drill&domain=${encodeURIComponent(DOMAINS[0].name)}`,
    );
  });

  it("flips the Step-1 primary to Resume (exact resume URL) with an answered-count line when in progress", async () => {
    const ids = getBank(AIP).slice(0, 5).map((q) => q.id);
    const a = createAttempt(AIP, "mock", ids);
    saveAttempt(a);
    recordResult(a.attemptId, { questionId: ids[0], chosen: [0], correct: false, flagged: false });
    recordResult(a.attemptId, { questionId: ids[1], chosen: [0], correct: false, flagged: false });

    renderPath();
    const resume = await screen.findByRole("link", { name: /resume practicing/i });
    const href = resume.getAttribute("href") ?? "";
    expect(href).toContain(`/aws/${AIP}/practice`);
    expect(href).toContain("mode=mock");
    expect(href).toContain(`resume=${a.attemptId}`);
    expect(screen.getByText(/Full Mock in progress/i)).toBeInTheDocument();
    expect(screen.getByText(/2 of 5 answered/i)).toBeInTheDocument();
  });

  it("counts only recorded choices in the resume line - a flagged-unanswered empty row does not inflate it", async () => {
    const ids = getBank(AIP).slice(0, 5).map((q) => q.id);
    const a = createAttempt(AIP, "mock", ids);
    saveAttempt(a);
    recordResult(a.attemptId, { questionId: ids[0], chosen: [0], correct: false, flagged: false });
    recordResult(a.attemptId, { questionId: ids[1], chosen: [0], correct: false, flagged: false });
    // Flagging an unanswered question persists an empty-chosen row (v1h) - it must NOT count.
    recordResult(a.attemptId, { questionId: ids[2], chosen: [], correct: false, flagged: true });

    renderPath();
    expect(await screen.findByText(/2 of 5 answered/i)).toBeInTheDocument();
  });

  it("keeps the newest on the primary CTA and lists older unfinished attempts as resume links", async () => {
    const ids = getBank(AIP).slice(0, 5).map((q) => q.id);
    // Older quick drill (started earlier) + newer mock (started later) both unfinished.
    const older = createAttempt(AIP, "quick", ids);
    older.startedAt = 1_700_000_000_000;
    saveAttempt(older);
    const newer = createAttempt(AIP, "mock", ids);
    newer.startedAt = 1_700_000_500_000;
    saveAttempt(newer);
    recordResult(newer.attemptId, { questionId: ids[0], chosen: [0], correct: false, flagged: false });

    renderPath();

    // Primary CTA resumes the newest (the mock).
    const primary = await screen.findByRole("link", { name: /resume practicing/i });
    expect(primary.getAttribute("href")).toContain(`resume=${newer.attemptId}`);

    // The older quick drill surfaces as a small resume link.
    const olderLink = screen.getByRole("link", { name: /Resume Quick Practice/i });
    expect(olderLink.getAttribute("href")).toContain(`resume=${older.attemptId}`);
  });

  it("offers a study-mode link to the reveal-as-you-go mock in Step 2", () => {
    renderPath();
    const link = screen.getByRole("link", { name: /answers as you go/i });
    expect(link).toHaveAttribute("href", `/aws/${AIP}/practice?mode=mock&reveal=1`);
    // The primary exam-mock link is unchanged and distinct.
    expect(screen.getByRole("link", { name: /take the full mock/i })).toHaveAttribute(
      "href",
      `/aws/${AIP}/practice?mode=mock`,
    );
  });
});

describe("DomainRows", () => {
  const DOMAINS = [
    { name: "Foundation Model Integration & Compliance", weightPct: 31 },
    { name: "Implementation & Integration", weightPct: 26 },
  ];

  it("renders a keyboard-operable drill link per domain, Not started with no history", () => {
    render(<DomainRows certId={AIP} vendorSlug="aws" passLinePct={75} domains={DOMAINS} />);
    const first = screen.getByRole("link", { name: /Drill Foundation Model Integration/i });
    expect(first).toHaveAttribute(
      "href",
      `/aws/${AIP}/practice?mode=drill&domain=${encodeURIComponent(DOMAINS[0].name)}`,
    );
    expect(screen.getAllByText("Not started").length).toBe(2);
    expect(screen.getByText(/31% of exam/)).toBeInTheDocument();
  });

  it("shows completed domain practice after two drills without requiring a full mock", () => {
    const domain = DOMAINS[0].name;
    const ids = getBank(AIP).filter((q) => q.domain === domain).slice(0, 2).map((q) => q.id);
    writeAll([1, 2].map((n) => attempt({ attemptId: `drill-${n}`, mode: "drill", domain, questionIds: ids, finishedAt: 1_700_000_100_000 + n })));
    render(<DomainRows certId={AIP} vendorSlug="aws" passLinePct={75} domains={DOMAINS} />);
    expect(screen.getByText("Practiced")).toBeInTheDocument();
    expect(screen.getByText("2 drills completed")).toBeInTheDocument();
    expect(screen.getAllByText("Not started")).toHaveLength(1);
    expect(screen.queryByText("Above")).not.toBeInTheDocument();
  });

  it("shows an unfinished domain drill as In progress", () => {
    writeAll([attempt({ mode: "drill", domain: DOMAINS[0].name })]);
    render(<DomainRows certId={AIP} vendorSlug="aws" passLinePct={75} domains={DOMAINS} />);
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getAllByText("Not started")).toHaveLength(1);
  });

  it("bands a domain from finished-mock accuracy (C10 verdict)", async () => {
    // Grade the first domain's questions all correct -> 'Above'.
    const bank = getBank(AIP);
    const domain = bank[0].domain;
    const ids = bank.filter((q) => q.domain === domain).slice(0, 6).map((q) => q.id);
    const results: Record<string, QuestionResult> = {};
    for (const id of ids) results[id] = { questionId: id, chosen: [], correct: true, flagged: false };
    writeAll([attempt({ mode: "mock", questionIds: ids, results, finishedAt: 1_700_000_100_000 })]);

    render(<DomainRows certId={AIP} vendorSlug="aws" passLinePct={75} domains={[{ name: domain, weightPct: 31 }]} />);
    expect(await screen.findByText("Above")).toBeInTheDocument();
  });
});

describe("ReadinessPanel", () => {
  it("shows Not started yet at 0% with no history", () => {
    render(<ReadinessPanel certId={AIP} passLinePct={75} />);
    expect(screen.getByText("Not started yet")).toBeInTheDocument();
    expect(screen.getByText(/Take a full mock to get your first read/i)).toBeInTheDocument();
  });

  // User-reported regression (2026-07-10): a FINISHED drill left the panel saying
  // "Not started yet - do a quick drill", recommending the exact thing just done
  // (which never feeds the mock-fed ring). Started-but-no-mock now reads honestly.
  it("reads In progress after a finished drill, pointing at a full mock for the read", async () => {
    writeAll([attempt({ mode: "drill", finishedAt: 1_700_000_100_000 })]);
    render(<ReadinessPanel certId={AIP} passLinePct={75} />);
    expect(await screen.findByText("In progress")).toBeInTheDocument();
    expect(screen.getByText(/Finish a full mock to get your readiness read/i)).toBeInTheDocument();
    expect(screen.queryByText("Not started yet")).not.toBeInTheDocument();
  });

  it("reads Study target met once the best finished mock meets the pass line", async () => {
    writeAll([gradedMock(20, 15)]); // 75% == pass line
    render(<ReadinessPanel certId={AIP} passLinePct={75} />);
    expect(await screen.findByText("Study target met")).toBeInTheDocument();
    // AIP-C01 uses a practice target, not a conversion of the scaled AWS score.
    expect(screen.queryByText(/Ready to book/i)).not.toBeInTheDocument();
  });

  it("reads Getting there when the best mock is below the pass line", async () => {
    writeAll([gradedMock(20, 10)]); // 50% < pass line
    render(<ReadinessPanel certId={AIP} passLinePct={75} />);
    expect(await screen.findByText("Getting there")).toBeInTheDocument();
  });

  it("says Study target (not Pass line) when the score is unofficial", async () => {
    writeAll([gradedMock(20, 15)]); // 75% >= pass line -> the note renders
    render(<ReadinessPanel certId={AIP} passLinePct={70} passLineOfficial={false} />);
    expect(await screen.findByText(/Study target 70%/i)).toBeInTheDocument();
    expect(screen.queryByText(/Pass line/i)).not.toBeInTheDocument();
  });
});
