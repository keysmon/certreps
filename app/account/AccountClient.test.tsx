import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Session } from "@supabase/supabase-js";
import { AccountClient } from "./AccountClient";
import { writeAll } from "@/lib/storage";
import { getMeta } from "@/lib/bank";
import { getSupabase, supabaseAvailable } from "@/lib/supabase/client";
import type { Attempt } from "@/lib/types";

// The page reaches Supabase only through these two helpers. Default them to unavailable in
// beforeEach so `session` resolves to null (no async auth) and the sync banner stays hidden -
// that isolates the dashboard derivation. The signed-in test flips them to exercise the banner.
vi.mock("@/lib/supabase/client", () => ({
  getSupabase: vi.fn(),
  supabaseAvailable: vi.fn(),
}));
const mockedAvailable = vi.mocked(supabaseAvailable);
const mockedGetSupabase = vi.mocked(getSupabase);

function sessionWith(email: string): Session {
  return { user: { id: "u1", email, user_metadata: {} } } as unknown as Session;
}

function fakeClient(session: Session | null) {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  } as unknown as ReturnType<typeof getSupabase>;
}

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

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  // Default: Supabase unavailable, so `session` stays null and the sync banner is hidden.
  mockedAvailable.mockReturnValue(false);
  mockedGetSupabase.mockReturnValue(null);
});
afterEach(() => vi.clearAllMocks());

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

  it("renders the signed-in sync banner and Synced-as eyebrow when signed in", async () => {
    mockedAvailable.mockReturnValue(true);
    mockedGetSupabase.mockReturnValue(fakeClient(sessionWith("ada@example.com")));
    render(<AccountClient welcome={false} />);

    // The emerald "Syncing on" banner, its Sign out button, and the identity eyebrow are the
    // signed-in surface - none of which render in the signed-out tests above.
    expect(await screen.findByText(/syncing on/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
    expect(screen.getByText(/synced as ada@example.com/i)).toBeInTheDocument();
  });
});
