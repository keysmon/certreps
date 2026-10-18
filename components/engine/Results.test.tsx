import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Results, answerLine } from "./Results";
import { getMeta } from "@/lib/bank";
import { HEAVY_PAUSE_THRESHOLD } from "@/lib/readiness";
import type { Attempt, Question } from "@/lib/types";

beforeEach(() => localStorage.clear());

const qs: Question[] = [0, 1, 2, 3].map((i) => ({
  id: `q${i}`, domain: getMeta().domains[i % 2].name, tag: `Domain ${(i % 2) + 1}`, type: "single",
  stem: `Stem number ${i}`, options: ["alpha opt", "beta opt", "gamma opt", "delta opt"], correct: [0],
  explanation: `<b>Explanation ${i}</b> covers the concept`, difficulty: "medium",
  docUrl: `https://docs.aws.amazon.com/x${i}`,
}));

function makeAttempt(pauseCount: number): Attempt {
  return {
    attemptId: "t1", certId: "aip-c01", mode: "mock", questionIds: qs.map((q) => q.id),
    results: {
      q0: { questionId: "q0", chosen: [0], correct: true, flagged: false },
      q1: { questionId: "q1", chosen: [1], correct: false, flagged: true },
      q2: { questionId: "q2", chosen: [0], correct: true, flagged: false },
      q3: { questionId: "q3", chosen: [2], correct: false, flagged: false },
    },
    startedAt: 1, finishedAt: 2, elapsedSec: 400, pauseCount,
  };
}

// All four correct -> 100%, above any pass line -> the "passed" verdict branch.
function passedAttempt(): Attempt {
  return {
    attemptId: "t2", certId: "aip-c01", mode: "mock", questionIds: qs.map((q) => q.id),
    results: {
      q0: { questionId: "q0", chosen: [0], correct: true, flagged: false },
      q1: { questionId: "q1", chosen: [0], correct: true, flagged: false },
      q2: { questionId: "q2", chosen: [0], correct: true, flagged: false },
      q3: { questionId: "q3", chosen: [0], correct: true, flagged: false },
    },
    startedAt: 1, finishedAt: 2, elapsedSec: 400, pauseCount: 0,
  };
}

describe("Results", () => {
  it("shows score, per-domain rows, and the review section", () => {
    render(<Results attempt={makeAttempt(0)} questions={qs} meta={getMeta()} />);
    expect(screen.getByRole("img", { name: "50%, 2 of 4 correct" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveFocus();
    expect(screen.getByText(/2 \/ 4 correct/i)).toBeInTheDocument();
    expect(screen.getByText(/performance by domain/i)).toBeInTheDocument();
    expect(screen.getByText(/review answers/i)).toBeInTheDocument();
    expect(screen.queryByText(/paused/i)).not.toBeInTheDocument();
  });
  it("shows the honesty stamp when heavily paused", () => {
    render(<Results attempt={makeAttempt(HEAVY_PAUSE_THRESHOLD)} questions={qs} meta={getMeta()} />);
    expect(screen.getByText(new RegExp(`paused ${HEAVY_PAUSE_THRESHOLD}x - timing may not reflect exam conditions`, "i"))).toBeInTheDocument();
  });
  it("shows a plain pause stamp below the heavy threshold, without the warning clause", () => {
    render(<Results attempt={makeAttempt(HEAVY_PAUSE_THRESHOLD - 1)} questions={qs} meta={getMeta()} />);
    expect(screen.getByText(new RegExp(`paused ${HEAVY_PAUSE_THRESHOLD - 1}x`, "i"))).toBeInTheDocument();
    expect(screen.queryByText(/timing may not reflect exam conditions/i)).not.toBeInTheDocument();
  });
});

describe("Results recap explanations", () => {
  it("keeps the review collapsed by default; opening it surfaces misses while correct stay collapsed", async () => {
    // Redesign: the whole review sits behind a "Review answers" toggle, so nothing shows until opened.
    // Once opened, a wrong row (q1) auto-expands so a miss is never buried; a correct row (q0) stays shut.
    const user = userEvent.setup();
    render(<Results attempt={makeAttempt(0)} questions={qs} meta={getMeta()} />);
    expect(screen.getByText(/Explanation 1/)).not.toBeVisible();
    await user.click(screen.getByText(/Review answers/).closest("summary") as HTMLElement);
    expect(screen.getByText(/Explanation 1/)).toBeVisible();
    expect(screen.getByText(/Explanation 0/)).not.toBeVisible();
  });

  it("expanding a recap row reveals its explanation and the vendor docs link", async () => {
    const user = userEvent.setup();
    render(<Results attempt={makeAttempt(0)} questions={qs} meta={getMeta()} />);
    await user.click(screen.getByText(/Review answers/).closest("summary") as HTMLElement);
    const summary = screen.getByText(/Stem number 0/).closest("summary") as HTMLElement;
    await user.click(summary);
    const details = summary.closest("details") as HTMLElement;
    expect(within(details).getByText(/Explanation 0/)).toBeVisible();
    const doclink = within(details).getByRole("link", { name: /read the aws docs/i });
    expect(doclink).toBeVisible();
    expect(doclink).toHaveAttribute("href", "https://docs.aws.amazon.com/x0");
  });

  it("recap doc-link label names a non-AWS cert's vendor (v1g wave-review regression)", () => {
    const meta = { ...getMeta(), vendorSlug: "databricks", vendor: "Databricks" };
    render(<Results attempt={makeAttempt(0)} questions={qs} meta={meta} />);
    // q1 is wrongly answered, so its row auto-opens - the doclink is queryable without a click.
    expect(screen.getAllByRole("link", { name: /read the databricks docs/i }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: /read the aws docs/i })).not.toBeInTheDocument();
  });

  it("marks the correct option emerald and a wrongly-chosen option rose in an expanded row", () => {
    render(<Results attempt={makeAttempt(0)} questions={qs} meta={getMeta()} />);
    // q1: correct=[0] ("alpha opt"), user chose [1] ("beta opt") - a wrong pick.
    // Wrong rows auto-open, so the row is already expanded - no click needed.
    const summary = screen.getByText(/Stem number 1/).closest("summary") as HTMLElement;
    const details = summary.closest("details") as HTMLElement;
    const correctOpt = within(details).getByText("alpha opt").closest(".option") as HTMLElement;
    expect(correctOpt).toHaveClass("correct");
    const wrongOpt = within(details).getByText("beta opt").closest(".option") as HTMLElement;
    expect(wrongOpt).toHaveClass("incorrect");
  });
});

describe("Results session guidance", () => {
  it("treats a strong single-domain drill as a session result, with no remedial domain recommendation", async () => {
    const questions = [qs[0], qs[2]];
    const attempt = { ...passedAttempt(), mode: "drill" as const, domain: qs[0].domain, questionIds: questions.map(q => q.id) };
    render(<Results attempt={attempt} questions={questions} meta={getMeta()} />);
    expect(screen.getByText("Domain drill result")).toBeInTheDocument();
    expect(screen.queryByText(/^readiness$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/performance by domain/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/drill .* next/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /retry/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /choose another domain/i })).toHaveAttribute("href", "/aws/aip-c01#domains");
  });

  it("recommends only below-target domains in a mixed mock", () => {
    render(<Results attempt={makeAttempt(0)} questions={qs} meta={getMeta()} />);
    const links = screen.getAllByRole("link", { name: /practice .* domain/i });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", `/aws/aip-c01/practice?mode=drill&domain=${encodeURIComponent(qs[1].domain)}`);
  });

  it("scopes retry to the completed session and opens its missed answers directly", async () => {
    render(<Results attempt={makeAttempt(0)} questions={qs} meta={getMeta()} />);
    expect(screen.getByRole("link", { name: /retry 2 missed questions/i })).toHaveAttribute("href", "/aws/aip-c01/practice?mode=retry&from=t1");
    await userEvent.click(screen.getByRole("button", { name: /review 2 missed questions/i }));
    expect(screen.getByText(/Explanation 1/)).toBeVisible();
    expect(screen.queryByText(/Stem number 0/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /show all 4 answers/i }));
    expect(screen.getByText(/Stem number 0/)).toBeInTheDocument();
  });

  it("distinguishes unanswered questions and includes them in this session's review", async () => {
    const attempt = makeAttempt(0);
    delete attempt.results.q3;
    render(<Results attempt={attempt} questions={qs} meta={getMeta()} />);
    expect(screen.getByText("2 correct · 1 incorrect · 1 unanswered")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /review 2 missed questions/i }));
    expect(screen.getByText(/Not answered/)).toBeVisible();
  });

  it("does not promise exam readiness after an official-cert quick session", () => {
    render(<Results attempt={{ ...passedAttempt(), mode: "quick" }} questions={qs} meta={{ ...getMeta(), certId: "official", passLineOfficial: true }} />);
    expect(screen.getByText("Quick practice result")).toBeInTheDocument();
    expect(screen.queryByText(/ready to book/i)).not.toBeInTheDocument();
  });
});

describe("answerLine view-order sort", () => {
  // The reviewer-witnessed scenario: canonical picks [0,3] under perm [1,3,4,0,2]
  // (perm[view]=canonical): canonical 3 displays at B, canonical 0 at D - so the
  // line lists B before D (view order), letters matching the seen positions.
  it("sorts multi-select entries by displayed position with view letters", () => {
    const options = ["opt0", "opt1", "opt2", "opt3", "opt4"];
    const perm = [1, 3, 4, 0, 2];
    const line = answerLine([0, 3], options, perm);
    expect(line.indexOf("B")).toBeLessThan(line.indexOf("D"));
    expect(line).toMatch(/^B .* opt3, D .* opt0$/);
  });

  it("reads Not answered for empty picks", () => {
    expect(answerLine([], ["a", "b"], [0, 1])).toBe("Not answered");
  });
});

it("keeps archived misses reviewable without offering an unavailable retry", async () => {
  const questions = [{ ...qs[1], excludedFromPractice: true }];
  render(<Results attempt={makeAttempt(0)} questions={questions} meta={getMeta()} />);
  expect(screen.queryByRole("link", { name: /retry/i })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Review 1 missed question" }));
  expect(screen.getByText(/Archived question:/)).toBeVisible();
});
