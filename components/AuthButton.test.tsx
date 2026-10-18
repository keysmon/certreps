import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";
import { AuthButton } from "./AuthButton";
import { getSupabase, supabaseAvailable } from "@/lib/supabase/client";
import { usePathname } from "next/navigation";

// Pathname-suppression guards are load-bearing (TopNav owns the auth surface on /,
// the login page IS the sign-in CTA) - mock usePathname so both can be locked.
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => null),
}));
const mockedPathname = vi.mocked(usePathname);

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

  it("suppresses itself on / (TopNav owns the landing auth surface)", () => {
    mockedAvailable.mockReturnValue(true);
    mockedGetSupabase.mockReturnValue(fakeClient(sessionWith("ada@example.com")));
    mockedPathname.mockReturnValue("/");
    const { container } = render(<AuthButton />);
    expect(container).toBeEmptyDOMElement();
  });

  it("suppresses the signed-out strip on /login (the page is the CTA)", () => {
    mockedAvailable.mockReturnValue(true);
    mockedGetSupabase.mockReturnValue(fakeClient(null));
    mockedPathname.mockReturnValue("/login");
    const { container } = render(<AuthButton />);
    expect(container).toBeEmptyDOMElement();
  });

  it("suppresses itself on /catalog (TopNav owns the catalog auth surface)", () => {
    mockedAvailable.mockReturnValue(true);
    mockedGetSupabase.mockReturnValue(fakeClient(sessionWith("ada@example.com")));
    mockedPathname.mockReturnValue("/catalog");
    const { container } = render(<AuthButton />);
    expect(container).toBeEmptyDOMElement();
  });

  it("suppresses itself on the cert detail route /aws/<certId> (TopNav owns it)", () => {
    mockedAvailable.mockReturnValue(true);
    mockedGetSupabase.mockReturnValue(fakeClient(sessionWith("ada@example.com")));
    mockedPathname.mockReturnValue("/aws/aip-c01");
    const { container } = render(<AuthButton />);
    expect(container).toBeEmptyDOMElement();
  });

  it("suppresses itself on the My progress dashboard /account (TopNav owns it)", () => {
    mockedAvailable.mockReturnValue(true);
    mockedGetSupabase.mockReturnValue(fakeClient(sessionWith("ada@example.com")));
    mockedPathname.mockReturnValue("/account");
    const { container } = render(<AuthButton />);
    expect(container).toBeEmptyDOMElement();
  });

  it("suppresses itself on Settings /settings (TopNav owns it)", () => {
    mockedAvailable.mockReturnValue(true);
    mockedGetSupabase.mockReturnValue(fakeClient(sessionWith("ada@example.com")));
    mockedPathname.mockReturnValue("/settings");
    const { container } = render(<AuthButton />);
    expect(container).toBeEmptyDOMElement();
  });

  it("still renders on the review-past route /account/attempts/<id> (no TopNav there)", async () => {
    mockedAvailable.mockReturnValue(true);
    mockedGetSupabase.mockReturnValue(fakeClient(sessionWith("ada@example.com")));
    mockedPathname.mockReturnValue("/account/attempts/abc-123");
    render(<AuthButton />);
    expect(await screen.findByText("ada@example.com")).toBeInTheDocument();
  });

  it("suppresses itself in the exam room /aws/<certId>/practice (distraction-free chrome)", () => {
    mockedAvailable.mockReturnValue(true);
    mockedGetSupabase.mockReturnValue(fakeClient(sessionWith("ada@example.com")));
    mockedPathname.mockReturnValue("/aws/aip-c01/practice");
    const { container } = render(<AuthButton />);
    expect(container).toBeEmptyDOMElement();
  });

  // Post-vendor-refactor: suppression is generic over the known vendor slugs, not hardcoded to /aws.
  it("suppresses itself on a non-AWS vendor cert detail /<vendor>/<certId> (TopNav owns it)", () => {
    mockedAvailable.mockReturnValue(true);
    mockedGetSupabase.mockReturnValue(fakeClient(sessionWith("ada@example.com")));
    mockedPathname.mockReturnValue("/databricks/genai-engineer");
    const { container } = render(<AuthButton />);
    expect(container).toBeEmptyDOMElement();
  });

  it("suppresses itself in a non-AWS vendor exam room /<vendor>/<certId>/practice", () => {
    mockedAvailable.mockReturnValue(true);
    mockedGetSupabase.mockReturnValue(fakeClient(sessionWith("ada@example.com")));
    mockedPathname.mockReturnValue("/nvidia/nca-genl/practice");
    const { container } = render(<AuthButton />);
    expect(container).toBeEmptyDOMElement();
  });

  it("still renders on a non-vendor two-segment path (suppression is anchored to real vendor slugs)", async () => {
    mockedAvailable.mockReturnValue(true);
    mockedGetSupabase.mockReturnValue(fakeClient(sessionWith("ada@example.com")));
    mockedPathname.mockReturnValue("/guides/aip-c01");
    render(<AuthButton />);
    expect(await screen.findByText("ada@example.com")).toBeInTheDocument();
  });
});


describe("AuthButton sign-out failures", () => {
  it.each(["returned", "thrown"])("shows retry feedback for a %s failure", async (kind) => {
    mockedPathname.mockReturnValue("/account/attempts/a1");
    mockedAvailable.mockReturnValue(true);
    const signOut = kind === "returned"
      ? vi.fn().mockResolvedValue({ error: { message: "Offline" } })
      : vi.fn().mockRejectedValue(new Error("Offline"));
    mockedGetSupabase.mockReturnValue(fakeClient(sessionWith("ada@example.com"), signOut));
    render(<AuthButton />);
    await screen.findByText("ada@example.com");
    await userEvent.click(screen.getByRole("button", { name: /^sign out$/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not sign out. Please try again.");
    expect(screen.getByRole("button", { name: /^sign out$/i })).toBeEnabled();
  });
});

it("does not duplicate the account controls on optional learning and incident routes", () => {
  mockedAvailable.mockReturnValue(true);
  mockedGetSupabase.mockReturnValue(fakeClient(sessionWith("ada@example.com")));
  for (const route of ["/learn", "/aws/aip-c01/learn", "/guides/aip-c01/implementation-and-integration", "/aws/aip-c01/incidents", "/aws/aip-c01/incidents/duplicate-refund"]) {
    mockedPathname.mockReturnValue(route);
    const {container, unmount} = render(<AuthButton />);
    expect(container).toBeEmptyDOMElement();
    unmount();
  }
});
