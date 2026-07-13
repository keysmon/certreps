"use client";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase/client";
import { useSession } from "@/lib/supabase/useSession";
import { initials } from "@/lib/initials";
import { CommandSwitcher } from "./CommandSwitcher";
import "./TopNav.css";

/**
 * Shared top navigation: loop mark + wordmark (home), a Catalog link, and a
 * session-aware auth slot reusing AuthButton's session logic via useSession.
 * Auth-slot semantics mirror AuthButton exactly: no control when Supabase is
 * unavailable (env-less = v1a parity), a "Sign in" ghost button when signed out,
 * and identity + "Sign out" when signed in. The landing page mounts this in place
 * of the layout's AuthButton strip; later tasks adopt it on interior pages too.
 * `active` marks the current nav link (bolder, aria-current) - Catalog and My progress today.
 */
export function TopNav({ active }: { active?: "catalog" | "progress" }) {
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
      {/* Global Cmd+K certification switcher (Task 9). Ships wherever TopNav lives, now including the
          practice engine (v1h mounts TopNav on the exam page for reachable nav; the engine binds no
          conflicting shortcut, so Cmd+K stays the switcher there too). */}
      <CommandSwitcher />
      <span className="tn-spacer" />
      <Link
        href="/catalog"
        className={`tn-link${active === "catalog" ? " tn-link-on" : ""}`}
        aria-current={active === "catalog" ? "page" : undefined}
      >
        Catalog
      </Link>
      <Link
        href="/account"
        className={`tn-link${active === "progress" ? " tn-link-on" : ""}`}
        aria-current={active === "progress" ? "page" : undefined}
      >
        My progress
      </Link>
      {available &&
        (session ? (
          <>
            <span className="tn-user">{label}</span>
            <button type="button" className="tn-signout" onClick={() => getSupabase()?.auth.signOut()}>
              Sign out
            </button>
            {/* Initials avatar -> Settings (the design routes the avatar there). Signed-out shows none. */}
            <Link href="/settings" className="tn-avatar" aria-label="Settings">
              {initials(label)}
            </Link>
          </>
        ) : (
          <Link href="/login" className="tn-signin">Sign in</Link>
        ))}
    </header>
  );
}
