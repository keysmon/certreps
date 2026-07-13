import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import userEvent from "@testing-library/user-event";
import type { Session } from "@supabase/supabase-js";
import { SettingsClient } from "./SettingsClient";
import { getSupabase, supabaseAvailable } from "@/lib/supabase/client";
import { readPrefs, writePrefs } from "@/lib/prefs";
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
  it("renders defaults in the effect-free (SSR) pass even when a pref is stored on (hydration-safe)", () => {
    mockedAvailable.mockReturnValue(false);
    // Stored pref is ON. renderToString runs no effects - it is exactly what the prerendered HTML
    // contains and what the client's first render must match. If the initial render read localStorage
    // the switch would come back on here and desync a real hard reload; SSR-safe init keeps it off.
    writePrefs({ reminders: true, newCerts: false, weekly: false });
    const html = renderToString(<SettingsClient />);
    const btn = html.match(/<button[^>]*aria-label="Study reminders"[^>]*>/)?.[0] ?? "";
    expect(btn).toContain('aria-checked="false"');
  });

  it("loads the stored pref via effect after mount, then toggles from that value in one click", async () => {
    mockedAvailable.mockReturnValue(false);
    writePrefs({ reminders: true, newCerts: false, weekly: false });
    render(<SettingsClient />);

    const reminders = screen.getByRole("switch", { name: "Study reminders" });
    // The mount effect loads the stored value: the switch transitions from its default-off SSR
    // state to on, so state and DOM agree - no two-click desync.
    await waitFor(() => expect(reminders).toHaveAttribute("aria-checked", "true"));
    await userEvent.click(reminders);
    expect(reminders).toHaveAttribute("aria-checked", "false");
    expect(readPrefs().reminders).toBe(false);
  });

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

  it("renders Signal Gold selected in the SSR pass even when an alternate is stored (hydration-safe)", () => {
    mockedAvailable.mockReturnValue(false);
    // Signal Gold is the deterministic SSR default; the real stored theme loads only after mount, so
    // the prerendered picker shows Signal Gold checked and matches the client's first render.
    localStorage.setItem("certreps.theme", "ocean");
    const html = renderToString(<SettingsClient />);
    const signal = html.match(/<button[^>]*aria-label="Signal Gold"[^>]*>/)?.[0] ?? "";
    const ocean = html.match(/<button[^>]*aria-label="Deep Ocean"[^>]*>/)?.[0] ?? "";
    expect(signal).toContain('aria-checked="true"');
    expect(ocean).toContain('aria-checked="false"');
  });

  it("loads a stored theme via effect after mount, migrating the legacy light value to Daylight", async () => {
    mockedAvailable.mockReturnValue(false);
    document.documentElement.removeAttribute("data-theme");
    localStorage.setItem("certreps.theme", "light"); // legacy value -> Daylight
    render(<SettingsClient />);
    const day = screen.getByRole("radio", { name: "Daylight" });
    await waitFor(() => expect(day).toHaveAttribute("aria-checked", "true"));
  });

  it("picks a theme: applies the html attribute, persists the canonical name, and toasts", async () => {
    mockedAvailable.mockReturnValue(false);
    document.documentElement.removeAttribute("data-theme");
    render(<SettingsClient />);

    const ocean = screen.getByRole("radio", { name: "Deep Ocean" });
    expect(ocean).toHaveAttribute("aria-checked", "false");
    await userEvent.click(ocean);

    expect(ocean).toHaveAttribute("aria-checked", "true");
    expect(document.documentElement.getAttribute("data-theme")).toBe("ocean");
    expect(localStorage.getItem("certreps.theme")).toBe("ocean");
    expect(await screen.findByText("Deep Ocean theme on")).toBeInTheDocument();

    // Signal Gold is the default and clears the attribute.
    await userEvent.click(screen.getByRole("radio", { name: "Signal Gold" }));
    expect(document.documentElement.getAttribute("data-theme")).toBeNull();
    expect(localStorage.getItem("certreps.theme")).toBe("signal");
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
    writePrefs({ reminders: true, newCerts: false, weekly: true });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<SettingsClient />);
    await screen.findByText("ada@example.com"); // wait for session to resolve so user.id is available
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(mocks.from).toHaveBeenCalledWith("attempts");
    expect(mocks.eq).toHaveBeenCalledWith("user_id", "u1");
    expect(readAll()).toEqual([]); // local attempt store cleared
    expect(readPrefs()).toEqual({ reminders: false, newCerts: false, weekly: false }); // prefs wiped too
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith("/");
    confirmSpy.mockRestore();
  });
});
