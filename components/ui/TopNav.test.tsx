import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";
import { TopNav } from "./TopNav";
import { getSupabase, supabaseAvailable } from "@/lib/supabase/client";

// TopNav's auth slot goes through useSession, which talks to Supabase only via these
// two helpers; mock the module so no browser client is built and no auth network fires.
// Mirrors AuthButton.test - the shared session logic is exercised through both surfaces.
vi.mock("@/lib/supabase/client", () => ({
  getSupabase: vi.fn(),
  supabaseAvailable: vi.fn(),
}));

// TopNav now mounts the CommandSwitcher (Task 9), whose Enter-to-open uses the app router.
// Stub next/navigation so the transitive render has a router outside an app-router provider.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const mockedAvailable = vi.mocked(supabaseAvailable);
const mockedGetSupabase = vi.mocked(getSupabase);
const unsubscribe = vi.fn();

function fakeClient(session: Session | null, signOut = vi.fn().mockResolvedValue({ error: null })) {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe } } })),
      signOut,
    },
  } as unknown as ReturnType<typeof getSupabase>;
}

function sessionWith(email: string): Session {
  return { user: { email, user_metadata: {} } } as unknown as Session;
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.clearAllMocks());

describe("TopNav", () => {
  it("renders the home logo and the cert switcher chip, with local study navigation", () => {
    mockedAvailable.mockReturnValue(false);
    render(<TopNav />);
    expect(screen.getByRole("link", { name: /certreps home/i })).toHaveAttribute("href", "/");
    // The compact cert chip (CommandSwitcher trigger) is present...
    expect(screen.getByRole("button", { name: /switch certification/i })).toBeInTheDocument();
    // ...but the redesign dropped the persistent Catalog / My progress text links.
    expect(screen.queryByRole("link", { name: "Catalog" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "My progress" })).toHaveAttribute("href", "/account");
  });

  it("shows no auth control when Supabase is unavailable", () => {
    mockedAvailable.mockReturnValue(false);
    render(<TopNav />);
    expect(screen.queryByRole("link", { name: /sign in/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /account menu/i })).not.toBeInTheDocument();
    expect(mockedGetSupabase).not.toHaveBeenCalled();
  });

  it("shows a Sign in link to /login when available and signed out (and no account menu)", async () => {
    mockedAvailable.mockReturnValue(true);
    mockedGetSupabase.mockReturnValue(fakeClient(null));
    render(<TopNav />);
    const link = await screen.findByRole("link", { name: /sign in/i });
    expect(link).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("button", { name: /account menu/i })).not.toBeInTheDocument();
  });

  it("opens the account menu when signed in (email + My progress + Settings + Sign out) and signs out", async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });
    mockedAvailable.mockReturnValue(true);
    mockedGetSupabase.mockReturnValue(fakeClient(sessionWith("ada@example.com"), signOut));
    render(<TopNav />);

    // Signed in: an avatar button; the email + menu items are hidden until it opens.
    const avatar = await screen.findByRole("button", { name: /account menu/i });
    expect(avatar).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("ada@example.com")).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /sign out/i })).not.toBeInTheDocument();

    await userEvent.click(avatar);
    expect(avatar).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /my progress/i })).toHaveAttribute("href", "/account");
    expect(screen.getByRole("menuitem", { name: /settings/i })).toHaveAttribute("href", "/settings");

    await userEvent.click(screen.getByRole("menuitem", { name: /sign out/i }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("closes the account menu on Escape and restores aria-expanded", async () => {
    mockedAvailable.mockReturnValue(true);
    mockedGetSupabase.mockReturnValue(fakeClient(sessionWith("ada@example.com")));
    render(<TopNav />);
    const avatar = await screen.findByRole("button", { name: /account menu/i });
    await userEvent.click(avatar);
    expect(screen.getByRole("menu")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(avatar).toHaveAttribute("aria-expanded", "false");
  });

  // Theme selection moved out of the bar into Settings (a 5-way picker) with the redesign - the bar
  // no longer carries a light/dark toggle. Theme behaviour is covered by lib/theme.test.ts and
  // SettingsClient.test.tsx.
});


it("lets anonymous users reach their saved progress and settings", () => {
  mockedAvailable.mockReturnValue(false);
  render(<TopNav />);
  expect(screen.getByRole("link", { name: "My progress" })).toHaveAttribute("href", "/account");
  expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/settings");
});


it("shows sign-out failure feedback in the account menu", async () => {
  const signOut = vi.fn().mockResolvedValue({ error: new Error("offline") });
  mockedAvailable.mockReturnValue(true);
  mockedGetSupabase.mockReturnValue(fakeClient(sessionWith("ada@example.com"), signOut));
  render(<TopNav />);
  await userEvent.click(await screen.findByRole("button", { name: /account menu/i }));
  await userEvent.click(screen.getByRole("menuitem", { name: /sign out/i }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/Could not sign out/);
});
