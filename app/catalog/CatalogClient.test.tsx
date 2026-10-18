import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CatalogClient, type CatalogCert } from "./CatalogClient";
import { listCerts, getCert } from "@/lib/certs";
import { getPracticeBank as getBank } from "@/lib/bank";
import { writeAll } from "@/lib/storage";
import type { Attempt, QuestionResult } from "@/lib/types";

// Build the exact props the server shell (page.tsx) passes: registry metadata plus the
// bank question count. Using the real registry keeps the client's progress pass honest.
const CERTS: CatalogCert[] = listCerts().map((m) => ({
  certId: m.certId,
  vendor: m.vendor,
  vendorSlug: m.vendorSlug,
  title: m.title,
  examCode: m.examCode,
  level: m.level,
  questions: getCert(m.certId)!.bank.length,
  passLinePct: m.passLinePct,
}));

const AIP = "aip-c01"; // Professional
// Registry-derived expectations: these tests survive registry growth (v1e adds certs in waves).
const N = CERTS.length;
const titlesOf = (level: string) =>
  CERTS.filter((c) => c.level === level).map((c) => expect.stringContaining(c.title));
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

// A finished mock graded to 100% (>= the pass line) - gives the card non-zero progress.
function passingMock(certId: string): Attempt {
  const ids = getBank(certId).slice(0, 20).map((q) => q.id);
  const results: Record<string, QuestionResult> = {};
  for (const id of ids) results[id] = { questionId: id, chosen: [], correct: true, flagged: false };
  return attempt({ certId, mode: "mock", questionIds: ids, results, finishedAt: 1_700_000_100_000 });
}

// The card grid: each CertCard is an anchor whose accessible name is the cert title.
const CARD_TITLES = listCerts().map((m) => m.title);
function gridTitles(): string[] {
  return screen
    .queryAllByRole("link")
    .map((a) => a.getAttribute("aria-label") ?? "")
    .filter((t) => CARD_TITLES.some((title) => t.includes(title)));
}

beforeEach(() => localStorage.clear());

describe("CatalogClient", () => {
  it("renders every exam with an 'N of M exams' count and the headline", () => {
    render(<CatalogClient certs={CERTS} />);
    expect(gridTitles()).toHaveLength(N);
    expect(screen.getByText(new RegExp(`${N} of ${N} exams`, "i"))).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: /what are you certifying in/i })).toBeInTheDocument();
  });

  it("narrows the grid via the single-select Level filter, and All restores it", async () => {
    render(<CatalogClient certs={CERTS} />);
    const assoc = screen.getByRole("button", { name: /^Associate$/i });
    expect(assoc).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(assoc);
    expect(assoc).toHaveAttribute("aria-pressed", "true");
    expect(gridTitles()).toEqual(titlesOf("Associate"));

    await userEvent.click(screen.getByRole("button", { name: /^All$/i }));
    expect(gridTitles()).toHaveLength(N);
  });

  it("filters by the search box and shows the empty state, which Clear filters resets", async () => {
    render(<CatalogClient certs={CERTS} />);
    const search = screen.getByRole("searchbox", { name: /search/i });

    await userEvent.type(search, "Machine Learning");
    expect(gridTitles()).toEqual([expect.stringMatching(MLA_TITLE)]);

    await userEvent.clear(search);
    await userEvent.type(search, "zzzzz-no-match");
    expect(gridTitles()).toHaveLength(0);
    expect(screen.getByText(/no exams match your search/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /clear filters/i }));
    expect(gridTitles()).toHaveLength(N);
    expect(search).toHaveValue("");
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

  it("flips a card footer to Resume once a finished mock gives it progress", async () => {
    writeAll([passingMock(AIP)]);
    render(<CatalogClient certs={CERTS} />);
    // Progress hydrates in an effect; the AIP card footer then shows Resume instead of Practice.
    expect(await screen.findByText(/Resume/)).toBeInTheDocument();
  });
});
