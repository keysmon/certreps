"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase/client";
import { useSession } from "@/lib/supabase/useSession";
import { initials } from "@/lib/initials";
import { getTheme, toggleTheme, type Theme } from "@/lib/theme";
import { CommandSwitcher } from "./CommandSwitcher";
import "./TopNav.css";

// Sun (offers light) / moon (offers dark) - the icon names the theme the click switches TO, pairing
// with the button's aria-label. Stroke inherits currentColor so it recolors with the nav.
function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

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

  // Theme toggle. The server (and first client render) MUST be a deterministic default so the
  // markup matches and hydration is clean; the real stored theme is read after mount, exactly like
  // SettingsClient loads prefs. The no-flash script in layout.tsx has already applied the correct
  // theme visually - this only syncs the button's icon/label to it.
  const [theme, setThemeState] = useState<Theme>("dark");
  useEffect(() => setThemeState(getTheme()), []);
  const isLight = theme === "light";

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
      {/* Global Cmd+K certification switcher (Task 9). Ships wherever TopNav lives - never on the
          practice engine, whose slim bar carries a static placeholder and keeps its own keyboard. */}
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
      <button
        type="button"
        className="tn-theme"
        onClick={() => setThemeState(toggleTheme())}
        aria-label={isLight ? "Switch to dark theme" : "Switch to light theme"}
      >
        {isLight ? <MoonIcon /> : <SunIcon />}
      </button>
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
