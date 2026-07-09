"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getSupabase } from "@/lib/supabase/client";
import { useSession } from "@/lib/supabase/useSession";

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
  const { session, available } = useSession();
  const pathname = usePathname();

  if (!available) return null;
  // TopNav owns the auth surface on pages that mount it (landing, catalog) - a second bare
  // strip above it is noise. As later tasks migrate interior pages to TopNav, they join this list.
  if (pathname === "/" || pathname === "/catalog") return null;
  // Cert detail (/aws/<certId>) mounts TopNav too (Task 5).
  if (pathname && /^\/aws\/[^/]+$/.test(pathname)) return null;
  // The My progress dashboard mounts TopNav (Task 8) - it owns the auth surface there.
  // Scoped to the exact page: /account/attempts/<id> (review-past) has no TopNav and keeps this strip.
  if (pathname === "/account") return null;
  // The exam room is distraction-free chrome by design (Task 6): the practice surface has
  // its own slim bar and no auth affordance - signing in mid-exam is not a real flow.
  if (pathname && /^\/aws\/[^/]+\/practice$/.test(pathname)) return null;
  // The login page IS the sign-in call to action - a second "Sign in" strip above it is noise.
  if (pathname === "/login" && !session) return null;

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
