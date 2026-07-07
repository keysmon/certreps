import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSupabase, supabaseAvailable } from "@/lib/supabase/client";
import { fullSync, queueUpsert } from "./sync-runtime";
import { readAll, writeAll } from "./storage";
import { toRow, type AttemptRow } from "./sync";
import type { Attempt, QuestionResult } from "./types";

// The runtime talks to Supabase only through these two helpers; mock the module so no
// browser client is ever constructed and no auth/network happens in tests.
vi.mock("@/lib/supabase/client", () => ({
  getSupabase: vi.fn(),
  supabaseAvailable: vi.fn(),
}));

const mockedAvailable = vi.mocked(supabaseAvailable);
const mockedGetSupabase = vi.mocked(getSupabase);

// Mirrors storage.ts's private KEY - the byte-identical assertion needs the raw serialization.
const STORAGE_KEY = "certreps.attempts.v1";

function mk(over: Partial<Attempt> = {}): Attempt {
  return {
    attemptId: "a1",
    certId: "aip-c01",
    mode: "quick",
    questionIds: ["q1", "q2"],
    results: {},
    startedAt: 1000,
    finishedAt: null,
    elapsedSec: 0,
    pauseCount: 0,
    ...over,
  };
}

// N recorded results (answered count = N).
function answered(n: number): Record<string, QuestionResult> {
  const r: Record<string, QuestionResult> = {};
  for (let i = 0; i < n; i++) r[`q${i}`] = { questionId: `q${i}`, chosen: [0], correct: true, flagged: false };
  return r;
}

type MockSession = { user: { id: string } } | null;

function fakeClient(opts: {
  session?: MockSession;
  cloudRows?: AttemptRow[];
  selectRejects?: boolean;
  upsertRejects?: boolean;
} = {}) {
  const { session = null, cloudRows = [], selectRejects = false, upsertRejects = false } = opts;
  const upsert = vi.fn((_row: AttemptRow, _options: { onConflict: string }) =>
    upsertRejects ? Promise.reject(new Error("upsert failed")) : Promise.resolve({ error: null }),
  );
  const select = vi.fn((_columns: string) =>
    selectRejects ? Promise.reject(new Error("pull failed")) : Promise.resolve({ data: cloudRows, error: null }),
  );
  const from = vi.fn(() => ({ upsert, select }));
  const getSession = vi.fn().mockResolvedValue({ data: { session } });
  const client = { auth: { getSession }, from } as unknown as NonNullable<ReturnType<typeof getSupabase>>;
  return { client, upsert, select, from, getSession };
}

let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  warnSpy.mockRestore();
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("queueUpsert", () => {
  it("does not upsert when signed out (available, but no session), even after the debounce window", async () => {
    vi.useFakeTimers();
    mockedAvailable.mockReturnValue(true);
    const { client, upsert } = fakeClient({ session: null });
    mockedGetSupabase.mockReturnValue(client);

    queueUpsert(mk({ finishedAt: null }));
    await vi.advanceTimersByTimeAsync(400);

    expect(upsert).not.toHaveBeenCalled();
  });

  it("does not create a client or set a timer when Supabase is unavailable", async () => {
    vi.useFakeTimers();
    mockedAvailable.mockReturnValue(false);

    queueUpsert(mk({ finishedAt: null }));
    await vi.advanceTimersByTimeAsync(400);

    expect(mockedGetSupabase).not.toHaveBeenCalled();
  });

  it("debounces rapid calls for one attempt into a single upsert of the LAST attempt", async () => {
    vi.useFakeTimers();
    mockedAvailable.mockReturnValue(true);
    const { client, upsert } = fakeClient({ session: { user: { id: "u1" } } });
    mockedGetSupabase.mockReturnValue(client);

    queueUpsert(mk({ attemptId: "a1", results: answered(1) }));
    queueUpsert(mk({ attemptId: "a1", results: answered(2) }));
    queueUpsert(mk({ attemptId: "a1", results: answered(3) }));
    await vi.advanceTimersByTimeAsync(400);

    expect(upsert).toHaveBeenCalledTimes(1);
    const [row, options] = upsert.mock.calls[0];
    expect(row.attempt_id).toBe("a1");
    expect(Object.keys(row.results).length).toBe(3);
    expect(options).toEqual({ onConflict: "user_id,attempt_id" });
  });

  it("upserts a FINISHED attempt immediately without waiting for the debounce window", async () => {
    vi.useFakeTimers();
    mockedAvailable.mockReturnValue(true);
    const { client, upsert } = fakeClient({ session: { user: { id: "u1" } } });
    mockedGetSupabase.mockReturnValue(client);

    queueUpsert(mk({ attemptId: "a1", finishedAt: 500 }));
    await vi.advanceTimersByTimeAsync(0); // flush microtasks only - NO 400ms advance

    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert.mock.calls[0][0].attempt_id).toBe("a1");
  });

  it("a finish supersedes a still-pending debounced upsert (one upsert, and it is the finished row)", async () => {
    vi.useFakeTimers();
    mockedAvailable.mockReturnValue(true);
    const { client, upsert } = fakeClient({ session: { user: { id: "u1" } } });
    mockedGetSupabase.mockReturnValue(client);

    queueUpsert(mk({ attemptId: "a1", finishedAt: null, results: answered(2) })); // arms the debounce
    queueUpsert(mk({ attemptId: "a1", finishedAt: 500, results: answered(2) })); // finish -> immediate, cancels timer
    await vi.advanceTimersByTimeAsync(400);

    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert.mock.calls[0][0].finished_at).not.toBeNull();
  });

  it("swallows a rejected upsert with a console.warn and never throws", async () => {
    vi.useFakeTimers();
    mockedAvailable.mockReturnValue(true);
    const { client, upsert } = fakeClient({ session: { user: { id: "u1" } }, upsertRejects: true });
    mockedGetSupabase.mockReturnValue(client);

    expect(() => queueUpsert(mk({ attemptId: "a1", finishedAt: 500 }))).not.toThrow();
    await vi.advanceTimersByTimeAsync(0);

    expect(upsert).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith("sync:", expect.anything());
  });
});

describe("fullSync", () => {
  it("no-ops (no select) when Supabase is unavailable", async () => {
    mockedAvailable.mockReturnValue(false);
    await expect(fullSync()).resolves.toBeUndefined();
    expect(mockedGetSupabase).not.toHaveBeenCalled();
  });

  it("no-ops when signed out (session null): no localStorage write", async () => {
    mockedAvailable.mockReturnValue(true);
    const seed = [mk({ attemptId: "L1", results: answered(2) })];
    writeAll(seed);
    const before = localStorage.getItem(STORAGE_KEY);
    const { client, select } = fakeClient({ session: null });
    mockedGetSupabase.mockReturnValue(client);

    await fullSync();

    expect(select).not.toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_KEY)).toBe(before);
  });

  it("merges cloud rows into localStorage and pushes pending local uploads", async () => {
    mockedAvailable.mockReturnValue(true);

    // X: local behind cloud (answered 1 vs 3) -> cloud wins, NOT uploaded.
    // Y: local finished vs cloud unfinished -> local wins AND is newer -> uploaded.
    // L1: local-only -> survives, uploaded.
    // C1: cloud-only -> lands in localStorage, NOT uploaded.
    const localX = mk({ attemptId: "X", results: answered(1), startedAt: 100 });
    const localY = mk({ attemptId: "Y", finishedAt: 500, startedAt: 400 });
    const localL1 = mk({ attemptId: "L1", results: answered(1), startedAt: 300 });
    writeAll([localX, localY, localL1]);

    const cloudX = mk({ attemptId: "X", results: answered(3), startedAt: 100 });
    const cloudY = mk({ attemptId: "Y", finishedAt: null, startedAt: 400 });
    const cloudC1 = mk({ attemptId: "C1", results: answered(1), startedAt: 200 });
    const cloudRows = [toRow(cloudX, "u1"), toRow(cloudY, "u1"), toRow(cloudC1, "u1")];

    const { client, upsert, select } = fakeClient({ session: { user: { id: "u1" } }, cloudRows });
    mockedGetSupabase.mockReturnValue(client);

    await fullSync();

    const byId = Object.fromEntries(readAll().map((a) => [a.attemptId, a]));
    expect(byId.C1).toBeTruthy(); // cloud-only merged in
    expect(Object.keys(byId.X.results).length).toBe(3); // cloud-ahead copy kept
    expect(byId.Y.finishedAt).toBe(500); // local-newer (finished) survived
    expect(byId.L1).toBeTruthy(); // local-only survived

    const uploaded = upsert.mock.calls.map((c) => c[0].attempt_id);
    expect(uploaded).toEqual(expect.arrayContaining(["Y", "L1"]));
    expect(uploaded).not.toContain("X");
    expect(uploaded).not.toContain("C1");
    expect(select).toHaveBeenCalledTimes(1);
  });

  it("a rejected pull leaves localStorage byte-identical and does not throw", async () => {
    mockedAvailable.mockReturnValue(true);
    const seed = [mk({ attemptId: "L1", results: answered(2) })];
    writeAll(seed);
    const before = localStorage.getItem(STORAGE_KEY);
    const { client, upsert } = fakeClient({ session: { user: { id: "u1" } }, selectRejects: true });
    mockedGetSupabase.mockReturnValue(client);

    await expect(fullSync()).resolves.toBeUndefined();

    expect(localStorage.getItem(STORAGE_KEY)).toBe(before);
    expect(upsert).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith("sync:", expect.anything());
  });
});
