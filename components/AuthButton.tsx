"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, supabaseAvailable } from "@/lib/supabase/client";

/**
 * Header session control. Renders NOTHING when Supabase is unavailable, so an
 * env-less deploy is visually identical to v1a. When available it subscribes to
 * auth state: a quiet "Sign in" link when signed out, the user's identity plus a
 * "Sign out" button when signed in. The right-aligned strip lives inside the
 * non-null branch so the layout adds zero height when this returns null.
 */
export function AuthButton() {
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

  if (!available) return null;

  const label = session?.user.email ?? (session?.user.user_metadata?.name as string | undefined);

  return (
    <div
      className="container"
      style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, paddingTop: 14 }}
    >
      {session ? (
        <>
          <span className="muted" style={{ fontSize: 13 }}>{label}</span>
          <button
            type="button"
            onClick={() => getSupabase()?.auth.signOut()}
            style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 13, cursor: "pointer", padding: 0, textDecoration: "underline" }}
          >
            Sign out
          </button>
        </>
      ) : (
        <Link href="/login" className="muted" style={{ fontSize: 13 }}>Sign in</Link>
      )}
    </div>
  );
}
