import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { HeroCtas, DomainRows, ReadinessPanel } from "./CertDetailClient";
import { createAttempt, saveAttempt, recordResult, writeAll } from "@/lib/storage";
import { getBank } from "@/lib/bank";
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

describe("HeroCtas", () => {
  it("shows Start practicing (-> quick) plus the mock and quick-drill ghosts by default", () => {
    render(<HeroCtas certId={AIP} vendorSlug="aws" mockMinutes={156} />);
    expect(screen.getByRole("link", { name: /start practicing/i })).toHaveAttribute(
      "href",
      `/aws/${AIP}/practice?mode=quick`,
    );
    expect(screen.getByRole("link", { name: /take full mock/i })).toHaveAttribute(
      "href",
      `/aws/${AIP}/practice?mode=mock`,
    );
    expect(screen.getByRole("link", { name: /quick 10-q drill/i })).toHaveAttribute(
      "href",
      `/aws/${AIP}/practice?mode=quick`,
    );
    // No resume-info line when nothing is in progress.
    expect(screen.queryByText(/in progress/i)).not.toBeInTheDocument();
  });

  it("flips the primary to Resume (exact resume URL) with an answered-count line when in progress", async () => {
    const ids = getBank(AIP).slice(0, 5).map((q) => q.id);
    const a = createAttempt(AIP, "mock", ids);
    saveAttempt(a);
    recordResult(a.attemptId, { questionId: ids[0], chosen: [0], correct: false, flagged: false });
    recordResult(a.attemptId, { questionId: ids[1], chosen: [0], correct: false, flagged: false });

    render(<HeroCtas certId={AIP} vendorSlug="aws" mockMinutes={156} />);
    const resume = await screen.findByRole("link", { name: /resume practicing/i });
    const href = resume.getAttribute("href") ?? "";
    expect(href).toContain(`/aws/${AIP}/practice`);
    expect(href).toContain("mode=mock");
    expect(href).toContain(`resume=${a.attemptId}`);
    // The slim resume-info line carries the answered count the design's CTA lacked.
    expect(screen.getByText(/Full Mock in progress/i)).toBeInTheDocument();
    expect(screen.getByText(/2 of 5 answered/i)).toBeInTheDocument();
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
    expect(screen.getByText(/get your first read/i)).toBeInTheDocument();
  });

  it("reads Ready to book once the best finished mock meets the pass line", async () => {
    writeAll([gradedMock(20, 15)]); // 75% == pass line
    render(<ReadinessPanel certId={AIP} passLinePct={75} />);
    expect(await screen.findByText("Ready to book")).toBeInTheDocument();
    expect(screen.getByText(/Pass line 75%/i)).toBeInTheDocument();
  });

  it("reads Getting there when the best mock is below the pass line", async () => {
    writeAll([gradedMock(20, 10)]); // 50% < pass line
    render(<ReadinessPanel certId={AIP} passLinePct={75} />);
    expect(await screen.findByText("Getting there")).toBeInTheDocument();
  });
});
