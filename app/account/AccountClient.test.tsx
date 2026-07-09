import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AccountClient } from "./AccountClient";
import { writeAll } from "@/lib/storage";
import { getMeta } from "@/lib/bank";
import type { Attempt } from "@/lib/types";

// The page reaches Supabase only through these two helpers. Held unavailable so `session`
// resolves to null synchronously (no async auth) and the sync banner stays hidden - that
// isolates the dashboard derivation (stat tiles, continue cards, recent activity, empty state).
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

// The multi-cert section headings of the pre-v1d /account page are gone: the dashboard now renders
// a stat strip, continue-studying cards, and a recent-activity list (grouping semantics moved into
// those derivations). These tests are rewritten to the new structure; the welcome-sync effect is
// unchanged and still verified through its own load path, and removed-cert resilience is preserved
// as an honest footnote instead of a per-cert "no longer available" card.
describe("AccountClient dashboard", () => {
  it("shows the empty state with a catalog CTA when there is no practice", async () => {
    render(<AccountClient welcome={false} />);
    expect(await screen.findByText(/no practice yet/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /browse certifications/i })).toHaveAttribute("href", "/catalog");
  });

  it("renders stat tiles, a continue card, and a recent-activity link for a finished attempt", async () => {
    writeAll([attempt({ attemptId: "aip-1", finishedAt: 1_700_000_100_000 })]);
    render(<AccountClient welcome={false} />);

    // Stat strip labels (values are derived - just prove the four tiles render).
    expect(await screen.findByText("Certs in progress")).toBeInTheDocument();
    expect(screen.getByText("Questions practiced")).toBeInTheDocument();
    expect(screen.getByText("Best score")).toBeInTheDocument();
    expect(screen.getByText("Exam-ready")).toBeInTheDocument();

    // The continue card headlines the cert; the recent-activity row links to its replay.
    expect(screen.getByRole("heading", { level: 3, name: getMeta().title })).toBeInTheDocument();
    const replay = screen.getAllByRole("link").find((l) => l.getAttribute("href") === "/account/attempts/aip-1");
    expect(replay).toBeDefined();
  });

  it("renders a removed-cert footnote without crashing, never the empty state", async () => {
    writeAll([attempt({ certId: UNKNOWN, attemptId: "unk-1", finishedAt: 1_700_000_100_000 })]);
    render(<AccountClient welcome={false} />);

    expect(await screen.findByText(/no longer available/i)).toBeInTheDocument();
    expect(screen.queryByText(/no practice yet/i)).not.toBeInTheDocument();
  });

  it("shows known-cert cards alongside a footnote when attempts span a removed cert", async () => {
    writeAll([
      attempt({ attemptId: "aip-1", finishedAt: 1_700_000_100_000 }),
      attempt({ certId: UNKNOWN, attemptId: "unk-1", finishedAt: 1_700_000_100_000 }),
    ]);
    render(<AccountClient welcome={false} />);

    expect(await screen.findByRole("heading", { level: 3, name: getMeta().title })).toBeInTheDocument();
    expect(screen.getByText(/1 attempt from certifications no longer available/i)).toBeInTheDocument();
  });
});
