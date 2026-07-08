"use client";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase/client";
import { useSession } from "@/lib/supabase/useSession";
import "./TopNav.css";

/**
 * Shared top navigation: loop mark + wordmark (home), a Catalog link, and a
 * session-aware auth slot reusing AuthButton's session logic via useSession.
 * Auth-slot semantics mirror AuthButton exactly: no control when Supabase is
 * unavailable (env-less = v1a parity), a "Sign in" ghost button when signed out,
 * and identity + "Sign out" when signed in. The landing page mounts this in place
 * of the layout's AuthButton strip; later tasks adopt it on interior pages too.
 */
export function TopNav() {
  const { session, available } = useSession();
  const label = session?.user.email ?? (session?.user.user_metadata?.name as string | undefined);

  return (
    <header className="tn-bar">
      <Link href="/" className="tn-logo" aria-label="CertReps home">
        <span className="tn-loop" aria-hidden="true">
          <svg viewBox="0 0 32 32" width="22" height="22">
            <circle
              cx="16"
              cy="16"
              r="8.5"
              fill="none"
              stroke="var(--gold)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray="42 11.4"
              transform="rotate(-35 16 16)"
            />
          </svg>
        </span>
        CertReps
      </Link>
      <span className="tn-spacer" />
      <Link href="/catalog" className="tn-link">Catalog</Link>
      {available &&
        (session ? (
          <>
            <span className="tn-user">{label}</span>
            <button type="button" className="tn-signout" onClick={() => getSupabase()?.auth.signOut()}>
              Sign out
            </button>
          </>
        ) : (
          <Link href="/login" className="tn-signin">Sign in</Link>
        ))}
    </header>
  );
}
