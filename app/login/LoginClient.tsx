"use client";
import { getSupabase, supabaseAvailable } from "@/lib/supabase/client";

type Provider = "google" | "github";

export function LoginClient({ failed }: { failed: boolean }) {
  if (!supabaseAvailable()) {
    return <p className="muted">Accounts are not available on this deployment.</p>;
  }

  function signIn(provider: Provider) {
    getSupabase()!.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  }

  return (
    <div className="card" style={{ maxWidth: 400, margin: "0 auto" }}>
      <p className="eyebrow">Optional account</p>
      <h1 style={{ fontSize: 22, margin: "6px 0 6px" }}>Sign in to sync your history</h1>
      <p className="small-copy" style={{ margin: "0 0 18px" }}>
        Accounts are optional - your attempts already save on this device. Sign in to sync them
        across devices.
      </p>
      {failed && (
        <p style={{ color: "var(--rose)", fontSize: 13.5, margin: "0 0 14px" }}>
          Sign-in didn&apos;t complete. Please try again.
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => signIn("google")}>
          Continue with Google
        </button>
        <button className="btn btn-ghost" style={{ width: "100%", justifyContent: "center" }} onClick={() => signIn("github")}>
          Continue with GitHub
        </button>
      </div>
    </div>
  );
}
