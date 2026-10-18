"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getSupabase } from "@/lib/supabase/client";
import { useSession } from "@/lib/supabase/useSession";
import { VENDORS } from "@/components/ui/VendorDot";

// Cert routes (/[vendor]/[certId] and its /practice child) mount TopNav, which owns the auth
// surface, so this bare strip suppresses itself there. Anchoring to the known vendor slugs keeps
// the match from ever catching /catalog, /account/..., /guides/... etc. VENDORS is a dependency-free
// literal, so importing it here (root layout, every page) never pulls the cert registry/banks in.
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const VENDOR_SEG = Object.keys(VENDORS).map(escapeRe).join("|");
const CERT_DETAIL_RE = new RegExp(`^/(${VENDOR_SEG})/[^/]+$`);
const CERT_PRACTICE_RE = new RegExp(`^/(${VENDOR_SEG})/[^/]+/practice$`);

/**
 * Header session control for interior pages. Renders NOTHING when Supabase is
 * unavailable, so an env-less deploy is visually identical to v1a. When available it
 * shows a quiet "Sign in" link when signed out and the user's identity plus a
 * "Sign out" button when signed in. The right-aligned strip lives inside the
 * non-null branch so the layout adds zero height when this returns null.
 * The landing page carries its own auth affordance in TopNav, so this suppresses
 * itself there; later tasks migrate interior pages to TopNav too.
 */
export function AuthButton() {
  const { session, available, loading, error: sessionError } = useSession();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const pathname = usePathname();

  if (!available) return null;
  // TopNav owns the auth surface on pages that mount it (landing, catalog) - a second bare
  // strip above it is noise. As later tasks migrate interior pages to TopNav, they join this list.
  if (pathname === "/" || pathname === "/catalog") return null;
  // Cert detail (/<vendor>/<certId>) mounts TopNav too (Task 5).
  if (pathname && CERT_DETAIL_RE.test(pathname)) return null;
  // The My progress dashboard mounts TopNav (Task 8) - it owns the auth surface there.
  // Scoped to the exact page: /account/attempts/<id> (review-past) has no TopNav and keeps this strip.
  if (pathname === "/account") return null;
  // Settings mounts TopNav too (Task 8) - it owns the auth surface there.
  if (pathname === "/settings") return null;
  // The exam room mounts TopNav (v1h), which owns the auth surface - so this bare strip suppresses
  // itself here for the same reason as /catalog, /account, /settings above. Code behavior unchanged.
  if (pathname && CERT_PRACTICE_RE.test(pathname)) return null;
  // The login page IS the sign-in call to action - a second "Sign in" strip above it is noise.
  if (pathname === "/login" && !session) return null;

  // These learning surfaces mount TopNav (or the compact incident toolbar).
  if (pathname === "/learn" || (pathname && /^\/guides\/[^/]+\/[^/]+$/.test(pathname)) || (pathname && new RegExp(`^/(${VENDOR_SEG})/[^/]+/(learn|incidents)(/[^/]+)?$`).test(pathname))) return null;
  if (loading) return null;
  if (sessionError) return <p role="alert" className="container muted">{sessionError}</p>;

  async function signOut() {
    setSigningOut(true);
    setSignOutError(null);
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("Accounts unavailable");
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch {
      setSignOutError("Could not sign out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

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
            onClick={signOut}
            disabled={signingOut}
            style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 13, cursor: "pointer", padding: 0, textDecoration: "underline" }}
          >
            {signingOut ? "Signing out..." : "Sign out"}
          </button>
        </>
      ) : (
        <Link href="/login" className="muted" style={{ fontSize: 13 }}>Sign in</Link>
      )}
      {session && signOutError && <span role="alert">{signOutError}</span>}
    </div>
  );
}
