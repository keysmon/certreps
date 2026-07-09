import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CatalogClient, type CatalogCert } from "./CatalogClient";
import { listCerts, getCert } from "@/lib/certs";
import { getBank } from "@/lib/bank";
import { writeAll } from "@/lib/storage";
import type { Attempt, QuestionResult } from "@/lib/types";

// Build the exact props the server shell (page.tsx) passes: registry metadata plus the
// bank question count. Using the real registry keeps the client's grading/status pass
// (getBank + gradeAttempt) honest - the same code path the browser runs.
const CERTS: CatalogCert[] = listCerts().map((m) => ({
  certId: m.certId,
  vendor: m.vendor,
  title: m.title,
  examCode: m.examCode,
  level: m.level,
  questions: getCert(m.certId)!.bank.length,
  passLinePct: m.passLinePct,
}));

const AIP = "aip-c01"; // Professional
const MLA = "mla-c01"; // Associate
// Registry-derived expectations: these tests survive registry growth (v1e adds certs in waves).
const N = CERTS.length;
const titlesOf = (level: string) =>
  CERTS.filter((c) => c.level === level).map((c) => expect.stringContaining(c.title));
const AIP_TITLE = /Generative AI Developer/i;
const MLA_TITLE = /Machine Learning Engineer/i;

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

// A finished mock graded to 100% (>= either cert's pass line) - drives the "Ready" status.
function passingMock(certId: string): Attempt {
  const ids = getBank(certId).slice(0, 20).map((q) => q.id);
  const results: Record<string, QuestionResult> = {};
  for (const id of ids) results[id] = { questionId: id, chosen: [], correct: true, flagged: false };
  return attempt({ certId, mode: "mock", questionIds: ids, results, finishedAt: 1_700_000_100_000 });
}

// The card grid: each CertCard is an anchor whose accessible name is the cert title.
function gridTitles(): string[] {
  return screen
    .queryAllByRole("link")
    .map((a) => a.getAttribute("aria-label") ?? "")
    .filter((t) => /AWS Certified/i.test(t));
}

beforeEach(() => localStorage.clear());

describe("CatalogClient", () => {
  it("renders every cert unfiltered with an 'N of M certifications' eyebrow", async () => {
    render(<CatalogClient certs={CERTS} />);
    expect(gridTitles()).toHaveLength(N);
    expect(screen.getByText(new RegExp(`${N} of ${N} certifications`, "i"))).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: /all certifications/i })).toBeInTheDocument();
  });

  it("narrows the grid to one cert when a Level facet chip is pressed, and toggles aria-pressed", async () => {
    render(<CatalogClient certs={CERTS} />);
    const assoc = screen.getByRole("button", { name: /^Associate/i });
    expect(assoc).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(assoc);
    expect(assoc).toHaveAttribute("aria-pressed", "true");
    expect(gridTitles()).toEqual(titlesOf("Associate"));
    // Single-selected facet drives the dynamic heading.
    expect(screen.getByRole("heading", { level: 1, name: /Associate/i })).toBeInTheDocument();

    // Toggling the same chip off restores the full grid.
    await userEvent.click(assoc);
    expect(assoc).toHaveAttribute("aria-pressed", "false");
    expect(gridTitles()).toHaveLength(N);
  });

  it("filters by the search box and shows the empty state, which Clear all filters resets", async () => {
    render(<CatalogClient certs={CERTS} />);
    const search = screen.getByRole("searchbox", { name: /search/i });

    await userEvent.type(search, "Machine Learning");
    expect(gridTitles()).toEqual([expect.stringMatching(MLA_TITLE)]);

    await userEvent.clear(search);
    await userEvent.type(search, "zzzzz-no-match");
    expect(gridTitles()).toHaveLength(0);
    expect(screen.getByText(/no certs match those filters/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /clear all filters/i }));
    expect(gridTitles()).toHaveLength(N);
    expect(search).toHaveValue("");
  });

  it("shows a removable active-filter tag that restores the grid when removed", async () => {
    render(<CatalogClient certs={CERTS} />);
    await userEvent.click(screen.getByRole("button", { name: /^Professional/i }));
    expect(gridTitles()).toEqual(titlesOf("Professional"));

    // A removable tag for the active value appears in the active-filter bar.
    const tag = screen.getByRole("button", { name: /remove Professional/i });
    await userEvent.click(tag);
    expect(gridTitles()).toHaveLength(N);
  });

  it("focuses the search box on '/' when focus is not already in a field", async () => {
    render(<CatalogClient certs={CERTS} />);
    const search = screen.getByRole("searchbox", { name: /search/i });
    expect(search).not.toHaveFocus();

    await userEvent.keyboard("/");
    expect(search).toHaveFocus();
    // The slash is a shortcut, not typed into the field.
    expect(search).toHaveValue("");
  });

  it("derives Status from local attempt history (Not started / In progress / Ready)", async () => {
    // aip-c01: an unfinished attempt -> In progress. mla-c01: a passing mock -> Ready.
    writeAll([attempt({ certId: AIP, finishedAt: null }), passingMock(MLA)]);
    render(<CatalogClient certs={CERTS} />);

    // Wait for the localStorage-reading effect to populate status, proven by a non-zero count.
    const ready = await screen.findByRole("button", { name: /^Ready/i });
    const inProgress = screen.getByRole("button", { name: /^In progress/i });
    const notStarted = screen.getByRole("button", { name: /^Not started/i });

    await userEvent.click(ready);
    expect(gridTitles()).toEqual([expect.stringMatching(MLA_TITLE)]);
    await userEvent.click(ready); // toggle off

    await userEvent.click(inProgress);
    expect(gridTitles()).toEqual([expect.stringMatching(AIP_TITLE)]);
    await userEvent.click(inProgress); // toggle off

    await userEvent.click(notStarted);
    // Every cert except the two with history is Not started (grows with the registry).
    expect(gridTitles()).toHaveLength(N - 2);
  });

  it("keeps chip counts live per value (Status counts reflect local history)", async () => {
    writeAll([passingMock(MLA)]);
    render(<CatalogClient certs={CERTS} />);

    // Vendor AWS covers both certs regardless of history.
    const aws = await screen.findByRole("button", { name: /^AWS/i });
    expect(within(aws).getByText(String(N))).toBeInTheDocument();

    // One cert is Ready, one is Not started after hydration.
    expect(within(screen.getByRole("button", { name: /^Ready/i })).getByText("1")).toBeInTheDocument();
    expect(within(screen.getByRole("button", { name: /^Not started/i })).getByText(String(N - 1))).toBeInTheDocument();
  });
});
