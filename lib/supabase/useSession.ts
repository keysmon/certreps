"use client";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, supabaseAvailable } from "./client";

/** Session state for UI only; this is not a server authorization check or sync status. */
export function useSession(): {
  session: Session | null;
  available: boolean;
  loading: boolean;
  error: string | null;
} {
  const available = supabaseAvailable();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(available);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!available) return;
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      setError("Unable to check your account. Please reload to try again.");
      return;
    }
    let active = true;
    let authEventReceived = false;
    setLoading(true);
    setError(null);
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      authEventReceived = true;
      setSession(next);
      setError(null);
      setLoading(false);
    });
    void (async () => {
      try {
        const result = await supabase.auth.getSession();
        if (!active || authEventReceived) return;
        if (result.error) throw result.error;
        setSession(result.data.session);
      } catch {
        if (!active || authEventReceived) return;
        setError("Unable to check your account. Please reload to try again.");
      } finally {
        if (active && !authEventReceived) setLoading(false);
      }
    })();
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [available]);

  return { session: available ? session : null, available, loading: available && loading, error: available ? error : null };
}
