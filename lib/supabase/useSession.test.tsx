import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";
import { useSession } from "./useSession";
import { getSupabase, supabaseAvailable } from "./client";
vi.mock("./client", () => ({ getSupabase: vi.fn(), supabaseAvailable: vi.fn() }));
const session = { user: { id: "u1" } } as Session;
function client(getSession: ReturnType<typeof vi.fn>) {
  let emit!: (event: string, next: Session | null) => void;
  const unsubscribe = vi.fn();
  const mock = { auth: { getSession, onAuthStateChange: vi.fn((cb) => {
    emit = cb;
    return { data: { subscription: { unsubscribe } } };
  }) } };
  vi.mocked(getSupabase).mockReturnValue(mock as unknown as ReturnType<typeof getSupabase>);
  return { emit: (next: Session | null) => emit("SIGNED_OUT", next), unsubscribe };
}
beforeEach(() => { vi.clearAllMocks(); vi.mocked(supabaseAvailable).mockReturnValue(true); });
describe("useSession", () => {
  it("settles rejected session lookup without an unhandled rejection", async () => {
    client(vi.fn().mockRejectedValue(new Error("Offline")));
    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current.error).toBe("Unable to check your account. Please reload to try again."));
    expect(result.current.loading).toBe(false);
  });
  it("does not replace a newer auth event with a stale initial lookup", async () => {
    let finish!: (value: { data: { session: Session } }) => void;
    const c = client(vi.fn(() => new Promise((resolve) => { finish = resolve; })));
    const { result } = renderHook(() => useSession());
    act(() => c.emit(null));
    await act(async () => { finish({ data: { session } }); });
    expect(result.current.session).toBeNull();
  });
  it("ignores a stale lookup failure after a newer auth event", async () => {
    let fail!: (reason: Error) => void;
    const c = client(vi.fn(() => new Promise((_resolve, reject) => { fail = reject; })));
    const { result } = renderHook(() => useSession());
    act(() => c.emit(session));
    await act(async () => { fail(new Error("Old request failed")); });
    expect(result.current.session).toEqual(session);
    expect(result.current.error).toBeNull();
  });
});
