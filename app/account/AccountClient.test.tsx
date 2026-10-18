import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { act, render, screen, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import * as syncRuntime from "@/lib/sync-runtime";
import type { Session } from "@supabase/supabase-js";
import { AccountClient } from "./AccountClient";
import { writeAll, listAttempts } from "@/lib/storage";
import { getMeta, getBank, getPracticeBank } from "@/lib/bank";
import { sampleMock } from "@/lib/sampler";
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
    from: vi.fn(() => ({ select: vi.fn().mockResolvedValue({ data: [], error: null }), upsert: vi.fn().mockResolvedValue({ error: null }) })),
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
afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); });

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
    expect(screen.getByText("Study target met")).toBeInTheDocument();

    // The continue card headlines the cert; the recent-activity row links to its replay.
    expect(screen.getByRole("heading", { level: 3, name: getMeta().title })).toBeInTheDocument();
    const replay = screen.getAllByRole("link").find((l) => l.getAttribute("href") === "/account/attempts/aip-1");
    expect(replay).toBeDefined();
  });

  it("Questions practiced counts only recorded choices, not flagged-unanswered empty rows", async () => {
    // Two answered (chosen recorded) + one flagged-but-unanswered empty-chosen row (v1h) => 2, not 3.
    const results = {
      q1: { questionId: "q1", chosen: [0], correct: false, flagged: false },
      q2: { questionId: "q2", chosen: [1], correct: false, flagged: false },
      q3: { questionId: "q3", chosen: [] as number[], correct: false, flagged: true },
    };
    writeAll([attempt({ attemptId: "aip-x", questionIds: ["q1", "q2", "q3"], results })]);
    render(<AccountClient welcome={false} />);
    const label = await screen.findByText("Questions practiced");
    expect(label.previousElementSibling?.textContent).toBe("2"); // .sv value precedes the .sl label
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

  it("keeps the newest unfinished attempt on the primary CTA and lists older ones as resume links", async () => {
    // Two unfinished sessions for the same cert: an older quick session and a newer mock.
    const older = attempt({ attemptId: "aip-quick", mode: "quick", questionIds: getPracticeBank().slice(0, 3).map((q) => q.id), startedAt: 1_700_000_000_000 });
    const newer = attempt({ attemptId: "aip-mock", mode: "mock", questionIds: getPracticeBank().slice(0, 5).map((q) => q.id), startedAt: 1_700_000_500_000 });
    writeAll([older, newer]);
    const { container } = render(<AccountClient welcome={false} />);
    await screen.findByRole("heading", { level: 3, name: getMeta().title });

    // The newest (mock) holds the card's primary Resume CTA.
    const primary = container.querySelector("a.btn-primary");
    expect(primary?.getAttribute("href")).toContain("resume=aip-mock");

    // The older quick session surfaces as its own small resume link (all unfinished attempts shown).
    // Label text comes from the shared attemptLabel helper (Task 2/7) - "Quick Practice" is the
    // canonical label, same as CertDetailClient's identical Resume-link pattern.
    const olderLink = screen.getByRole("link", { name: /resume quick practice/i });
    expect(olderLink.getAttribute("href")).toContain("resume=aip-quick");
  });

  it("renders the signed-in sync banner and Synced-as eyebrow when signed in", async () => {
    mockedAvailable.mockReturnValue(true);
    mockedGetSupabase.mockReturnValue(fakeClient(sessionWith("ada@example.com")));
    render(<AccountClient welcome={false} />);

    // The emerald "Syncing on" banner, its Sign out button, and the identity eyebrow are the
    // signed-in surface - none of which render in the signed-out tests above.
    expect(await screen.findByText(/account backup enabled/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
    expect(screen.getByText(/^signed in as ada@example.com$/i)).toBeInTheDocument();
  });
});


it("offers fresh practice instead of archived or missing unfinished sessions without deleting them", async () => {
  const archived = getBank().find((q) => q.excludedFromPractice)!;
  writeAll([attempt({ attemptId: "archived-open", questionIds: [archived.id] }), attempt({ attemptId: "missing-open", questionIds: ["missing"] })]);
  const { container } = render(<AccountClient welcome={false} />);
  await screen.findByRole("heading", { level: 3, name: getMeta().title });
  expect(container.querySelector("a.btn-primary")).toHaveAttribute("href", "/aws/aip-c01/practice?mode=quick");
  expect(container.querySelector('a[href*="resume="]')).toBeNull();
  expect(listAttempts(AIP).map((a) => a.attemptId).sort()).toEqual(["archived-open", "missing-open"]);
});

it("does not count a certification whose study target is met as in progress", async () => {
  const questions = sampleMock(getPracticeBank(), getMeta());
  const results = Object.fromEntries(questions.map((q) => [q.id, { questionId: q.id, chosen: q.correct, correct: true, flagged: false }]));
  writeAll([attempt({ attemptId: "target-met", questionIds: questions.map((q) => q.id), results, finishedAt: 1_700_000_100_000 })]);
  render(<AccountClient welcome={false} />);
  const inProgress = await screen.findByText("Certs in progress");
  expect(inProgress.previousElementSibling?.textContent).toBe("0");
  expect(screen.getByText("Study target met").previousElementSibling?.textContent).toBe("1");
  expect(screen.queryByText("Exam-ready")).not.toBeInTheDocument();
});


it("refreshes saved progress after a cross-tab storage update without remounting", async () => {
  render(<AccountClient welcome={false} />);
  await screen.findByText(/no practice yet/i);
  act(() => {
    writeAll([attempt({ attemptId: "from-other-tab", mode: "quick", questionIds: [getPracticeBank()[0].id] })]);
    window.dispatchEvent(new StorageEvent("storage", { key: "certreps.attempts.v1" }));
  });
  expect(await screen.findByRole("heading", { level: 3, name: getMeta().title })).toBeInTheDocument();
  expect(screen.queryByText(/no practice yet/i)).not.toBeInTheDocument();
});


it("keeps local history available when checking the account fails", async () => {
  mockedAvailable.mockReturnValue(true);
  const client = fakeClient(null)!;
  vi.mocked(client.auth.getSession).mockRejectedValue(new Error("offline"));
  mockedGetSupabase.mockReturnValue(client);
  render(<AccountClient welcome={false} />);
  expect(await screen.findByRole("alert")).toHaveTextContent(/Unable to check your account/);
  expect(await screen.findByText("No practice yet")).toBeInTheDocument();
});


it("finishes post-login navigation even when sync updates the local store before uploads finish", async () => {
  mockedAvailable.mockReturnValue(true);
  mockedGetSupabase.mockReturnValue(fakeClient(sessionWith("ada@example.com")));
  let finishSync!: () => void;
  const pending = new Promise<void>((resolve) => { finishSync = resolve; });
  const spy = vi.spyOn(syncRuntime, "fullSync").mockImplementation(async () => {
    writeAll([attempt({ mode: "quick", finishedAt: 100 })]);
    await pending;
  });
  render(<AccountClient welcome />);
  await screen.findByText("Continue studying");
  await act(async () => { finishSync(); await pending; });
  expect(useRouter().replace).toHaveBeenCalledWith("/account");
  expect(spy).toHaveBeenCalledTimes(1);
  spy.mockRestore();
});


it("shows an error if dashboard sign-out fails", async () => {
  mockedAvailable.mockReturnValue(true);
  const client = fakeClient(sessionWith("ada@example.com"))!;
  vi.mocked(client.auth.signOut).mockResolvedValue({ error: new Error("offline") } as never);
  mockedGetSupabase.mockReturnValue(client);
  render(<AccountClient welcome={false} />);
  await userEvent.click(await screen.findByRole("button", { name: "Sign out" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not sign out");
});


it("pulls cloud history on a normal signed-in dashboard visit without welcome=1", async () => {
  mockedAvailable.mockReturnValue(true);
  mockedGetSupabase.mockReturnValue(fakeClient(sessionWith("user@example.com")));
  const ids = getPracticeBank().slice(0, 2).map((q) => q.id);
  const remote = attempt({ attemptId: "cloud-completed", mode: "quick", questionIds: ids, finishedAt: 100,
    results: Object.fromEntries(ids.map((id, i) => [id, {questionId:id, chosen:[0], correct:i === 0, flagged:false}])) });
  const spy = vi.spyOn(syncRuntime, "fullSync").mockImplementation(async () => { writeAll([remote]); });
  render(<AccountClient welcome={false} />);
  await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
  expect(await screen.findByRole("link", { name: /quick practice.*50%/i })).toHaveAttribute("href", "/account/attempts/cloud-completed");
});

it("refreshes cloud progress on focus and online recovery without overlapping pulls", async () => {
  mockedAvailable.mockReturnValue(true);
  mockedGetSupabase.mockReturnValue(fakeClient(sessionWith("user@example.com")));
  let complete!: () => void;
  const spy = vi.spyOn(syncRuntime, "fullSync").mockImplementation(() => new Promise<void>((resolve) => { complete = resolve; }));
  render(<AccountClient welcome={false} />);
  await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
  act(() => { window.dispatchEvent(new Event("focus")); window.dispatchEvent(new Event("online")); });
  expect(spy).toHaveBeenCalledTimes(1);
  await act(async () => { complete(); });
  act(() => { window.dispatchEvent(new Event("focus")); });
  expect(spy).toHaveBeenCalledTimes(2);
  await act(async () => { complete(); });
  act(() => { window.dispatchEvent(new Event("online")); });
  expect(spy).toHaveBeenCalledTimes(3);
  await act(async () => { complete(); });
});

it("does not start cloud pulls for a signed-out dashboard", async () => {
  mockedAvailable.mockReturnValue(true);
  mockedGetSupabase.mockReturnValue(fakeClient(null));
  const spy = vi.spyOn(syncRuntime, "fullSync").mockResolvedValue();
  render(<AccountClient welcome={false} />);
  await screen.findByText("No practice yet");
  act(() => window.dispatchEvent(new Event("focus")));
  expect(spy).not.toHaveBeenCalled();
});
