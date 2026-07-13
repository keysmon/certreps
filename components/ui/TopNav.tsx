"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase/client";
import { useSession } from "@/lib/supabase/useSession";
import { initials } from "@/lib/initials";
import { CommandSwitcher } from "./CommandSwitcher";
import "./TopNav.css";

/**
 * Signed-in account menu: an initials avatar that opens a small dropdown (My progress / Settings /
 * Sign out). The redesign's minimal bar drops the persistent nav links, so this menu is the only
 * chrome path to account + settings for signed-in users - hence it must be reliably reachable and
 * dismissable. Closes on outside click or Escape (Escape restores focus to the avatar), and moves
 * focus to the first item on open. Better than the design prototype, which neither traps nor restores
 * focus (same bar the CommandSwitcher holds).
 */
function AccountMenu({ label, onSignOut }: { label?: string; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;
    firstItemRef.current?.focus();
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="tn-acct" ref={wrapRef}>
      <button
        type="button"
        ref={btnRef}
        className="tn-avatar"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((o) => !o)}
      >
        {initials(label)}
      </button>
      {open && (
        <div className="tn-menu" role="menu" aria-label="Account">
          {label && (
            <div className="tn-menu-email" aria-hidden="true">
              {label}
            </div>
          )}
          <Link ref={firstItemRef} href="/account" role="menuitem" className="tn-menu-item" onClick={() => setOpen(false)}>
            My progress
          </Link>
          <Link href="/settings" role="menuitem" className="tn-menu-item" onClick={() => setOpen(false)}>
            Settings
          </Link>
          <button
            type="button"
            role="menuitem"
            className="tn-menu-item tn-menu-signout"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Shared minimal top bar (redesign "global chrome"): the ring-mark logo (home) + a divider + the
 * compact Cmd+K cert switcher chip, then a muted device/sync status and the auth surface. The
 * redesign drops the persistent Catalog / My progress nav links (logo -> home covers catalog; the
 * chip covers cert nav; signed-in users reach account + settings through the avatar menu) and the
 * in-bar theme toggle (theme moved to a 5-way Settings picker). Auth-slot semantics mirror AuthButton:
 * no control when Supabase is unavailable (env-less parity), a "Sign in" link when signed out, and the
 * AccountMenu avatar when signed in. Mounted by every page that owns its own auth surface.
 */
export function TopNav() {
  const { session, available } = useSession();
  const label = session?.user.email ?? (session?.user.user_metadata?.name as string | undefined);
  // Honest, quiet status: local-only until you sign in, then synced. Shown once the auth layer is
  // available so it never contradicts what the auth slot offers.
  const status = session ? "Synced to your account" : "Progress saved on this device";

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
      <span className="tn-divider" aria-hidden="true" />
      {/* Global Cmd+K certification switcher, restyled as the compact cert chip. Ships wherever TopNav
          lives, including the practice engine (it binds no conflicting shortcut). */}
      <CommandSwitcher />
      <span className="tn-spacer" />
      {available && <span className="tn-status">{status}</span>}
      {available &&
        (session ? (
          <AccountMenu label={label} onSignOut={() => getSupabase()?.auth.signOut()} />
        ) : (
          <Link href="/login" className="tn-signin">
            Sign in
          </Link>
        ))}
    </header>
  );
}
