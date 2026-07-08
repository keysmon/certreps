"use client";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, supabaseAvailable } from "./client";

/**
 * Shared auth-session subscription. Returns the current Supabase session (null when
 * signed out or when Supabase is unavailable) plus the availability flag, so callers
 * can gate their auth UI. Extracted from AuthButton so AuthButton and TopNav share one
 * subscription implementation instead of duplicating the getSession/onAuthStateChange
 * dance. Env-less (no Supabase vars) the effect never runs and session stays null.
 */
export function useSession(): { session: Session | null; available: boolean } {
  const available = supabaseAvailable();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!available) return;
    const supabase = getSupabase();
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, [available]);

  return { session, available };
}
