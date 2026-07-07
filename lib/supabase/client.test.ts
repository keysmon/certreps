import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock @supabase/ssr so no real browser client is ever constructed and no network happens.
const { createBrowserClient } = vi.hoisted(() => ({
  createBrowserClient: vi.fn(() => ({ __brand: "supabase-browser-client" })),
}));
vi.mock("@supabase/ssr", () => ({ createBrowserClient }));

const SUPABASE_URL = "https://project-ref.supabase.co";
const ANON_KEY = "anon-public-key";

beforeEach(() => {
  // Fresh module per test so the memoized client resets and env stubs are honored.
  vi.resetModules();
  vi.unstubAllEnvs();
  createBrowserClient.mockClear();
});

afterEach(() => vi.unstubAllEnvs());

describe("supabaseAvailable", () => {
  it("is false when no env vars are set", async () => {
    const { supabaseAvailable } = await import("./client");
    expect(supabaseAvailable()).toBe(false);
  });

  it("is true when both env vars are set", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", ANON_KEY);
    const { supabaseAvailable } = await import("./client");
    expect(supabaseAvailable()).toBe(true);
  });

  it("is false when only one env var is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
    const { supabaseAvailable } = await import("./client");
    expect(supabaseAvailable()).toBe(false);
  });
});

describe("getSupabase", () => {
  it("returns null and constructs nothing when unavailable", async () => {
    const { getSupabase } = await import("./client");
    expect(getSupabase()).toBeNull();
    expect(createBrowserClient).not.toHaveBeenCalled();
  });

  it("returns a memoized client (same instance across calls) when available", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", ANON_KEY);
    const { getSupabase } = await import("./client");
    const first = getSupabase();
    const second = getSupabase();
    expect(first).not.toBeNull();
    expect(first).toBe(second);
    expect(createBrowserClient).toHaveBeenCalledTimes(1);
  });
});
