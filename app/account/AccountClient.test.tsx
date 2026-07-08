import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AccountClient } from "./AccountClient";
import { writeAll } from "@/lib/storage";
import { getMeta } from "@/lib/bank";
import type { Attempt } from "@/lib/types";

// The page reaches Supabase only through these two helpers. Held unavailable so `session`
// resolves to null synchronously (no async auth) and the trend/account surfaces stay hidden -
// that isolates the multi-cert history grouping, and lets the parity test assert on the
// ABSENCE of any section heading without a Readiness/Account h3 muddying the query.
vi.mock("@/lib/supabase/client", () => ({
  getSupabase: vi.fn(() => null),
  supabaseAvailable: vi.fn(() => false),
}));

// A STABLE router singleton: AccountClient's load effect lists `router` in its deps, so a
// fresh object per render would re-fire the effect every setState and spin an infinite loop.
vi.mock("next/navigation", () => {
  const router = { replace: vi.fn(), push: vi.fn() };
  return { useRouter: () => router };
});

const AIP = getMeta().certId; // the one real registry cert
const UNKNOWN = "zzz-c99"; // a certId that is NOT in the registry (removed-cert path)

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

beforeEach(() => localStorage.clear());

describe("AccountClient multi-cert history", () => {
  it("renders one headed section per cert when attempts span two certs", async () => {
    writeAll([
      attempt({ certId: AIP, attemptId: "aip-1" }),
      attempt({ certId: UNKNOWN, attemptId: "unk-1" }),
    ]);
    render(<AccountClient welcome={false} />);

    // Both section headings must appear (examCode for the known cert, raw certId for the removed one).
    const known = await screen.findByText(new RegExp(getMeta().examCode, "i"));
    const removed = screen.getByText(UNKNOWN);
    expect(known.tagName).toBe("H3");
    expect(removed.tagName).toBe("H3");
    // ...in registry order first, then unknown certs - getAllByRole returns DOM order.
    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings).toHaveLength(2);
    expect(headings[0]).toBe(known);
    expect(headings[1]).toBe(removed);
  });

  it("renders NO section heading when exactly one cert has attempts (visual parity gate)", async () => {
    writeAll([attempt({ certId: AIP, attemptId: "aip-1" })]);
    render(<AccountClient welcome={false} />);

    // The single in-progress row proves the history loaded; the parity gate is the h3 absence.
    await screen.findByText(/in progress/i);
    expect(screen.queryByRole("heading", { level: 3 })).not.toBeInTheDocument();
  });

  it("renders a removed-cert section without crashing when a cert left the registry", async () => {
    writeAll([attempt({ certId: UNKNOWN, attemptId: "unk-1", finishedAt: 1_700_000_100_000 })]);
    render(<AccountClient welcome={false} />);

    // Removed cert -> a distinct "no longer available" card, never the empty-history state or a fake 0%.
    expect(await screen.findByText(/no longer available/i)).toBeInTheDocument();
    expect(screen.queryByText(/no practice history yet/i)).not.toBeInTheDocument();
  });
});
