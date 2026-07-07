"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import type { Attempt } from "@/lib/types";
import { getSupabase, supabaseAvailable } from "@/lib/supabase/client";
import { fullSync } from "@/lib/sync-runtime";
import { listAttempts, readAll, clearAll } from "@/lib/storage";
import { getMeta } from "@/lib/bank";
import { AttemptsList } from "@/components/account/AttemptsList";
import { TrendPanel } from "@/components/account/TrendPanel";

const H3: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--muted)",
  fontWeight: 500,
  margin: "0 0 14px",
};

/**
 * The account page body. localStorage is the source of truth, so every attempt read happens
 * in an effect (never in render) - that keeps the page SSR-safe and lets it render fully in
 * env-less, local-only mode. Supabase surfaces (sign-in prompt, trend, delete/export) appear
 * only when a project is configured. `session` is undefined while unknown so neither the
 * signed-out prompt nor the signed-in actions flash before auth state resolves.
 */
export function AccountClient({ welcome }: { welcome: boolean }) {
  const meta = getMeta();
  const router = useRouter();
  const available = supabaseAvailable();
  const [session, setSession] = useState<Session | null | undefined>(available ? undefined : null);
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);
  const syncedRef = useRef(false);

  // Subscribe to auth state (same idiom as AuthButton) so the signed-in surfaces track sign-out.
  useEffect(() => {
    if (!available) return;
    const supabase = getSupabase();
    if (!supabase) {
      setSession(null);
      return;
    }
    let live = true;
    supabase.auth.getSession().then(({ data }) => {
      if (live) setSession(data.session);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => {
      live = false;
      data.subscription.unsubscribe();
    };
  }, [available]);

  // Post-login merge runs once, then the welcome param is stripped so a re-render never re-syncs.
  // Attempts are (re)loaded from the freshly-merged localStorage afterwards.
  useEffect(() => {
    let live = true;
    (async () => {
      if (welcome && supabaseAvailable() && !syncedRef.current) {
        syncedRef.current = true;
        await fullSync();
        if (live) router.replace("/account");
      }
      if (live) setAttempts(listAttempts(meta.certId));
    })();
    return () => {
      live = false;
    };
  }, [welcome, router, meta.certId]);

  function onExport() {
    const blob = new Blob([JSON.stringify(readAll(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `certreps-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function onDelete() {
    if (!window.confirm("Delete all your practice data from this device and the cloud? This cannot be undone.")) return;
    const supabase = getSupabase();
    const userId = session?.user.id;
    try {
      if (supabase && userId) await supabase.from("attempts").delete().eq("user_id", userId);
    } catch (e) {
      console.warn("delete:", e); // best-effort: still wipe local + sign out below
    }
    clearAll();
    try {
      await supabase?.auth.signOut();
    } catch {
      /* signing out is best-effort - the local data is already gone */
    }
    router.push("/");
  }

  return (
    <>
      <h1 style={{ fontSize: "clamp(24px, 4vw, 32px)", lineHeight: 1.15, margin: "0 0 6px" }}>Your history</h1>
      <p className="muted" style={{ margin: "0 0 24px" }}>
        Every practice attempt saved on this device{available ? ", synced across devices when you are signed in." : "."}
      </p>

      {available && session === null && (
        <div className="card" style={{ marginBottom: 20 }}>
          <p style={{ margin: 0, fontSize: 14.5 }}>
            <Link href="/login">Sign in</Link> to keep your history across devices.
          </p>
        </div>
      )}

      {attempts === null ? (
        <p className="muted">Loading your history...</p>
      ) : (
        <AttemptsList attempts={attempts} meta={meta} />
      )}

      {session && attempts !== null && (
        <>
          <div style={{ marginTop: 28 }}>
            <TrendPanel attempts={attempts} meta={meta} />
          </div>

          <div className="card" style={{ marginTop: 28 }}>
            <h3 style={H3}>Account</h3>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button type="button" className="btn btn-ghost" onClick={onExport}>
                Export my data
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={onDelete}
                style={{ color: "var(--rose)", borderColor: "var(--rose)" }}
              >
                Delete my data
              </button>
            </div>
            <p className="muted" style={{ fontSize: 12.5, margin: "12px 0 0" }}>
              Export downloads every attempt as JSON. Delete removes your data here and in the cloud, then signs you out.
            </p>
          </div>
        </>
      )}
    </>
  );
}
