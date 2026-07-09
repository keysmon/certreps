import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Session } from "@supabase/supabase-js";
import { SettingsClient } from "./SettingsClient";
import { getSupabase, supabaseAvailable } from "@/lib/supabase/client";
import { readPrefs } from "@/lib/prefs";
import { readAll, writeAll } from "@/lib/storage";
import type { Attempt } from "@/lib/types";

// Session resolves through these two helpers (via useSession); mock the module so no browser
// client is built and no auth network fires. Same idiom as AuthButton.test.
vi.mock("@/lib/supabase/client", () => ({
  getSupabase: vi.fn(),
  supabaseAvailable: vi.fn(),
}));

// Stable router singleton (delete pushes home); a fresh object per render would churn effects.
const router = { push: vi.fn(), replace: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const mockedAvailable = vi.mocked(supabaseAvailable);
const mockedGetSupabase = vi.mocked(getSupabase);

function sessionWith(email: string): Session {
  return { user: { id: "u1", email, user_metadata: {} } } as unknown as Session;
}

function fakeClient(session: Session | null) {
  const eq = vi.fn().mockResolvedValue({ error: null });
  const del = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ delete: del }));
  const signOut = vi.fn().mockResolvedValue({ error: null });
  const client = {
    from,
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut,
    },
  };
  return { client: client as unknown as ReturnType<typeof getSupabase>, from, del, eq, signOut };
}

function attempt(): Attempt {
  return {
    attemptId: "a-1",
    certId: "aip-c01",
    mode: "mock",
    questionIds: [],
    results: {},
    startedAt: 1_700_000_000_000,
    finishedAt: 1_700_000_100_000,
    elapsedSec: 0,
    pauseCount: 0,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});
afterEach(() => vi.clearAllMocks());

describe("SettingsClient", () => {
  it("persists a notification toggle to the prefs store and toasts", async () => {
    mockedAvailable.mockReturnValue(false); // signed out - notifications toggle regardless of auth
    render(<SettingsClient />);

    const reminders = screen.getByRole("switch", { name: "Study reminders" });
    expect(reminders).toHaveAttribute("aria-checked", "false");
    await userEvent.click(reminders);

    expect(reminders).toHaveAttribute("aria-checked", "true");
    expect(readPrefs().reminders).toBe(true);
    expect(await screen.findByText("Turned on")).toBeInTheDocument();
  });

  it("shows the sync row as a disabled, off switch requiring an account when signed out", () => {
    mockedAvailable.mockReturnValue(false);
    render(<SettingsClient />);

    const sync = screen.getByRole("switch", { name: /sync progress across devices/i });
    expect(sync).toBeDisabled();
    expect(sync).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText(/requires an account/i)).toBeInTheDocument();
  });

  it("shows the sync row as on-but-locked when signed in", async () => {
    mockedAvailable.mockReturnValue(true);
    mockedGetSupabase.mockReturnValue(fakeClient(sessionWith("ada@example.com")).client);
    render(<SettingsClient />);

    expect(await screen.findByText(/on while signed in/i)).toBeInTheDocument();
    const sync = screen.getByRole("switch", { name: /sync progress across devices/i });
    expect(sync).toBeDisabled();
    expect(sync).toHaveAttribute("aria-checked", "true");
  });

  it("exports the local store as a JSON download", async () => {
    mockedAvailable.mockReturnValue(false);
    const createObjectURL = vi.fn(() => "blob:x");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { value: createObjectURL, writable: true, configurable: true });
    Object.defineProperty(URL, "revokeObjectURL", { value: revokeObjectURL, writable: true, configurable: true });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(<SettingsClient />);
    await userEvent.click(screen.getByRole("button", { name: "Export" }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    clickSpy.mockRestore();
  });

  it("runs the delete flow: cloud delete, local clear, sign out, home", async () => {
    mockedAvailable.mockReturnValue(true);
    const mocks = fakeClient(sessionWith("ada@example.com"));
    mockedGetSupabase.mockReturnValue(mocks.client);
    writeAll([attempt()]);
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<SettingsClient />);
    await screen.findByText("ada@example.com"); // wait for session to resolve so user.id is available
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(mocks.from).toHaveBeenCalledWith("attempts");
    expect(mocks.eq).toHaveBeenCalledWith("user_id", "u1");
    expect(readAll()).toEqual([]); // local store cleared
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith("/");
    confirmSpy.mockRestore();
  });
});
