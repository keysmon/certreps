"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase, supabaseAvailable } from "@/lib/supabase/client";
import { resumeIncidentSyncAfterSignIn } from "@/lib/incident-store";
import { resumeSyncAfterSignIn } from "@/lib/sync-runtime";
import "./login.css";

/**
 * Google/GitHub OAuth is deferred by user decision 2026-07-07 - email+password ships
 * first as the only login method. The provider flow below stays dormant; re-enable by
 * registering the provider apps (Supabase dashboard + Google/GitHub) and flipping this flag.
 */
const OAUTH_DEFERRED = true;
type Provider = "google" | "github";

function signInWithOAuth(provider: Provider) {
  getSupabase()!.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${location.origin}/auth/callback` },
  });
}

type Mode = "signin" | "signup";

// Glyphs via fromCharCode (craft convention) so the source stays ASCII-clean.
const ARROW = String.fromCharCode(8594);
const MIDDOT = String.fromCharCode(183);
const CYCLE = String.fromCharCode(10227); // rotate
const CHECK = String.fromCharCode(10003); // check
const DIAMOND = String.fromCharCode(9670); // filled diamond

const FEATURES = [
  { ic: CYCLE, t: "Completed reps across devices", d: "Sign in to sync completed attempts when connected." },
  { ic: CHECK, t: "Resume on this device", d: "Finish an in-progress drill on the device where you started it." },
  { ic: DIAMOND, t: `Free forever ${MIDDOT} no spam`, d: "Your account syncs practice attempts and answers. Export or delete practice data in Settings." },
];

export function LoginClient({ failed }: { failed: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!supabaseAvailable()) {
    return <p className="muted">Accounts are not available on this deployment.</p>;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setPending(true);

    let navigating = false;
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("Accounts unavailable");
      const { data, error } = mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
        return;
      }
      if (data.session) {
        resumeSyncAfterSignIn();
        resumeIncidentSyncAfterSignIn();
        router.push("/account?welcome=1");
        navigating = true;
        return;
      }
      setNotice("Check your email to confirm your account.");
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      if (!navigating) setPending(false);
    }
  }

  function toggleMode() {
    setMode((m) => (m === "signin" ? "signup" : "signin"));
    setError(null);
    setNotice(null);
  }

  const isSignin = mode === "signin";
  const submitLabel = isSignin ? "Sign in" : "Create account";

  return (
    <div className="li-wrap">
      <aside className="li-pitch">
        <div className="li-logo">
          <span className="li-loop" aria-hidden="true">
            CR
          </span>
          CertReps
        </div>
        <h2 className="li-pitch-h">Keep your reps across every device.</h2>
        <p className="li-pitch-p">
          Practicing is always free and needs no account. Sign in only if you want your progress to follow you.
        </p>
        {FEATURES.map((f) => (
          <div className="li-feat" key={f.t}>
            <span className="ic" aria-hidden="true">{f.ic}</span>
            <div>
              <div className="ft">{f.t}</div>
              <div className="fd">{f.d}</div>
            </div>
          </div>
        ))}
      </aside>

      <div className="li-form">
        <p className="li-eyebrow">Optional account</p>
        <h1 className="li-h1">
          {isSignin ? "Sign in to sync your progress" : "Create an account to sync your progress"}
        </h1>
        <p className="li-lede">
          Accounts are optional - your attempts already save on this device. Completed attempts can sync across devices when connected.
        </p>
        {failed && <p className="li-error">Sign-in didn&apos;t complete. Please try again.</p>}

        <form onSubmit={onSubmit}>
          <div className="li-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="li-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              // Client-side guardrail on account creation only; never strength-validate a
              // sign-in (the password already exists). Supabase enforces the real policy.
              minLength={isSignin ? undefined : 8}
              autoComplete={isSignin ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {!isSignin && <p className="li-hint">At least 8 characters.</p>}
          </div>

          {/* aria-live: these two insert AFTER submit, so screen readers need the announcement. */}
          <div aria-live="polite">
            {error && <p className="li-error" style={{ margin: "0 0 8px" }}>{error}</p>}
            {notice && <p className="li-hint" style={{ margin: "0 0 8px" }}>{notice}</p>}
          </div>

          <button type="submit" className="btn btn-primary li-submit" disabled={pending}>
            {pending ? "Working..." : submitLabel}
          </button>
        </form>

        <button type="button" onClick={toggleMode} className="li-toggle" disabled={pending}>
          {isSignin ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>

        {/* Dormant while OAUTH_DEFERRED - the provider buttons re-appear (styled) when the flag flips. */}
        {!OAUTH_DEFERRED && (
          <>
            <div className="li-divider">or continue with</div>
            <div className="li-oauth">
              <button type="button" className="btn btn-oauth" onClick={() => signInWithOAuth("google")}>
                Continue with Google
              </button>
              <button type="button" className="btn btn-oauth" onClick={() => signInWithOAuth("github")}>
                Continue with GitHub
              </button>
            </div>
          </>
        )}

        <p className="li-fine">
          Your practice data stays yours - export or delete it anytime in Settings.
        </p>
        <div className="li-skip">
          <Link href="/catalog">Continue without an account {ARROW}</Link>
        </div>
      </div>
    </div>
  );
}
