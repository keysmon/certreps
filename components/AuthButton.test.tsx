import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";
import { AuthButton } from "./AuthButton";
import { getSupabase, supabaseAvailable } from "@/lib/supabase/client";

// The component talks to Supabase only through these two helpers; mock the module
// so no browser client is ever constructed and no auth network happens in tests.
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

function sessionWith(email: string, name?: string): Session {
  return { user: { email, user_metadata: name ? { name } : {} } } as unknown as Session;
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.clearAllMocks());

describe("AuthButton", () => {
  it("renders nothing when Supabase is unavailable", () => {
    mockedAvailable.mockReturnValue(false);
    const { container } = render(<AuthButton />);
    expect(container).toBeEmptyDOMElement();
    expect(mockedGetSupabase).not.toHaveBeenCalled();
  });

  it("shows a quiet Sign in link to /login when available and signed out", async () => {
    mockedAvailable.mockReturnValue(true);
    mockedGetSupabase.mockReturnValue(fakeClient(null));
    render(<AuthButton />);
    const link = await screen.findByRole("link", { name: /sign in/i });
    expect(link).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("button", { name: /sign out/i })).not.toBeInTheDocument();
  });

  it("shows the email and a Sign out button when signed in, and signs out on click", async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });
    mockedAvailable.mockReturnValue(true);
    mockedGetSupabase.mockReturnValue(fakeClient(sessionWith("ada@example.com"), signOut));
    render(<AuthButton />);
    expect(await screen.findByText("ada@example.com")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /sign out/i }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});
