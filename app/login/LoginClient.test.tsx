import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoginClient } from "./LoginClient";
import { getSupabase, supabaseAvailable } from "@/lib/supabase/client";

// The component reaches Supabase only through these two helpers - mock the module
// so no browser client is built and no auth network happens in tests.
vi.mock("@/lib/supabase/client", () => ({
  getSupabase: vi.fn(),
  supabaseAvailable: vi.fn(),
}));

// router.push is the post-login merge redirect - assert on it instead of navigating.
const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const mockedAvailable = vi.mocked(supabaseAvailable);
const mockedGetSupabase = vi.mocked(getSupabase);

type Result = { data: { session: unknown }; error: { message: string } | null };
const ok: Result = { data: { session: {} }, error: null };

function fakeClient(opts: { signIn?: Result; signUp?: Result } = {}) {
  return {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue(opts.signIn ?? ok),
      signUp: vi.fn().mockResolvedValue(opts.signUp ?? ok),
      signInWithOAuth: vi.fn(),
    },
  } as unknown as NonNullable<ReturnType<typeof getSupabase>>;
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.clearAllMocks());

describe("LoginClient", () => {
  it("renders an email + password form with a submit button when available", () => {
    mockedAvailable.mockReturnValue(true);
    mockedGetSupabase.mockReturnValue(fakeClient());
    render(<LoginClient failed={false} />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^sign in$/i })).toBeInTheDocument();
  });

  it("submits sign-in mode with the typed values", async () => {
    mockedAvailable.mockReturnValue(true);
    const client = fakeClient();
    mockedGetSupabase.mockReturnValue(client);
    render(<LoginClient failed={false} />);
    await userEvent.type(screen.getByLabelText(/email/i), "ada@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "Test12345!");
    await userEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
    await waitFor(() =>
      expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "ada@example.com",
        password: "Test12345!",
      }),
    );
  });

  it("pushes /account?welcome=1 on a successful sign-in", async () => {
    mockedAvailable.mockReturnValue(true);
    mockedGetSupabase.mockReturnValue(fakeClient());
    render(<LoginClient failed={false} />);
    await userEvent.type(screen.getByLabelText(/email/i), "ada@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "Test12345!");
    await userEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/account?welcome=1"));
  });

  it("renders the Supabase error message on a failed sign-in", async () => {
    mockedAvailable.mockReturnValue(true);
    mockedGetSupabase.mockReturnValue(
      fakeClient({ signIn: { data: { session: null }, error: { message: "Invalid login credentials" } } }),
    );
    render(<LoginClient failed={false} />);
    await userEvent.type(screen.getByLabelText(/email/i), "ada@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "wrongpass");
    await userEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(await screen.findByText("Invalid login credentials")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("toggles to Create account mode and submits via signUp", async () => {
    mockedAvailable.mockReturnValue(true);
    const client = fakeClient();
    mockedGetSupabase.mockReturnValue(client);
    render(<LoginClient failed={false} />);
    await userEvent.click(screen.getByRole("button", { name: /new here/i }));
    await userEvent.type(screen.getByLabelText(/email/i), "new@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "Test12345!");
    await userEvent.click(screen.getByRole("button", { name: /^create account$/i }));
    await waitFor(() =>
      expect(client.auth.signUp).toHaveBeenCalledWith({
        email: "new@example.com",
        password: "Test12345!",
      }),
    );
    expect(client.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("renders the unavailable line when Supabase is not configured", () => {
    mockedAvailable.mockReturnValue(false);
    render(<LoginClient failed={false} />);
    expect(screen.getByText("Accounts are not available on this deployment.")).toBeInTheDocument();
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
  });
});
