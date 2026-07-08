"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase, supabaseAvailable } from "@/lib/supabase/client";

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

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 13px",
  fontSize: 15,
  fontFamily: "var(--font-sans)",
  color: "var(--text)",
  background: "var(--panel-2)",
  border: "1px solid var(--line-strong)",
  borderRadius: "var(--radius-sm)",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  color: "var(--muted)",
  margin: "0 0 6px",
};

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

    const supabase = getSupabase()!;
    const { data, error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
      setPending(false);
      return;
    }
    if (data.session) {
      // Same post-login merge path OAuth used - fullSync() runs on the account page.
      router.push("/account?welcome=1");
      return; // keep pending true through the navigation
    }
    // signUp with email-confirmation on (autoconfirm off someday) returns no session.
    setNotice("Check your email to confirm your account.");
    setPending(false);
  }

  function toggleMode() {
    setMode((m) => (m === "signin" ? "signup" : "signin"));
    setError(null);
    setNotice(null);
  }

  const isSignin = mode === "signin";
  const submitLabel = isSignin ? "Sign in" : "Create account";

  return (
    <div className="card" style={{ maxWidth: 400, margin: "0 auto" }}>
      <p className="eyebrow">Optional account</p>
      <h1 style={{ fontSize: 22, margin: "6px 0 6px" }}>
        {isSignin ? "Sign in to sync your history" : "Create an account to sync your history"}
      </h1>
      <p className="small-copy" style={{ margin: "0 0 18px" }}>
        Accounts are optional - your attempts already save on this device. Sign in to sync them
        across devices.
      </p>
      {failed && (
        <p style={{ color: "var(--rose)", fontSize: 13.5, margin: "0 0 14px" }}>
          Sign-in didn&apos;t complete. Please try again.
        </p>
      )}

      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label htmlFor="email" style={labelStyle}>
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label htmlFor="password" style={labelStyle}>
            Password
          </label>
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
            style={inputStyle}
          />
          {!isSignin && (
            <p className="small-copy" style={{ margin: "6px 0 0", fontSize: 12.5 }}>
              At least 8 characters.
            </p>
          )}
        </div>

        {error && (
          <p style={{ color: "var(--rose)", fontSize: 13.5, margin: 0 }}>{error}</p>
        )}
        {notice && (
          <p className="small-copy" style={{ margin: 0 }}>
            {notice}
          </p>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={pending}
          style={{ width: "100%", justifyContent: "center" }}
        >
          {pending ? "Working..." : submitLabel}
        </button>
      </form>

      {/* Dormant while OAUTH_DEFERRED - the provider buttons re-appear when the flag flips. */}
      {!OAUTH_DEFERRED && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
          <button
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center" }}
            onClick={() => signInWithOAuth("google")}
          >
            Continue with Google
          </button>
          <button
            className="btn btn-ghost"
            style={{ width: "100%", justifyContent: "center" }}
            onClick={() => signInWithOAuth("github")}
          >
            Continue with GitHub
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={toggleMode}
        style={{
          background: "none",
          border: "none",
          color: "var(--muted)",
          fontSize: 13,
          cursor: "pointer",
          padding: 0,
          marginTop: 16,
          textDecoration: "underline",
        }}
      >
        {isSignin ? "New here? Create an account" : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
