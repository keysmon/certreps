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
  it("always renders the home logo and Catalog link", () => {
    mockedAvailable.mockReturnValue(false);
    render(<TopNav />);
    expect(screen.getByRole("link", { name: /certreps home/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Catalog" })).toHaveAttribute("href", "/catalog");
  });

  it("shows no auth control when Supabase is unavailable", () => {
    mockedAvailable.mockReturnValue(false);
    render(<TopNav />);
    expect(screen.queryByRole("link", { name: /sign in/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /sign out/i })).not.toBeInTheDocument();
    expect(mockedGetSupabase).not.toHaveBeenCalled();
  });

  it("shows a Sign in link to /login when available and signed out", async () => {
    mockedAvailable.mockReturnValue(true);
    mockedGetSupabase.mockReturnValue(fakeClient(null));
    render(<TopNav />);
    const link = await screen.findByRole("link", { name: /sign in/i });
    expect(link).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("button", { name: /sign out/i })).not.toBeInTheDocument();
  });

  it("shows the email and a Sign out button when signed in, and signs out on click", async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });
    mockedAvailable.mockReturnValue(true);
    mockedGetSupabase.mockReturnValue(fakeClient(sessionWith("ada@example.com"), signOut));
    render(<TopNav />);
    expect(await screen.findByText("ada@example.com")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /sign out/i }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});
