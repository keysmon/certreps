"use client";
import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import type { Attempt, CertMeta } from "@/lib/types";
import { getSupabase, supabaseAvailable } from "@/lib/supabase/client";
import { fullSync } from "@/lib/sync-runtime";
import { readAll, clearAll } from "@/lib/storage";
import { listCerts, getCert } from "@/lib/certs";
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

interface CertSection {
  certId: string;
  meta: CertMeta | null; // null once a cert has left the registry (removed-cert path)
  attempts: Attempt[];
}

/**
 * Split the flat attempt store into one section per cert. Registry certs come first in
 * registry order (home/sitemap order), then any certs no longer in the registry in first-seen
 * order - those render a plain "no longer available" note instead of a graded list, mirroring
 * the removed-cert card on the replay page. Each group is sorted ascending by startedAt to
 * preserve the old listAttempts(certId) contract; both AttemptsList and TrendPanel re-sort
 * internally, so this is explicit intent rather than a rendered-order dependency.
 */
function groupByCert(attempts: Attempt[]): CertSection[] {
  const groups = new Map<string, Attempt[]>();
  for (const a of attempts) {
    const list = groups.get(a.certId);
    if (list) list.push(a);
    else groups.set(a.certId, [a]);
  }
  const registryOrder = listCerts().map((m) => m.certId);
  const known = registryOrder.filter((id) => groups.has(id));
  const unknown = [...groups.keys()].filter((id) => !registryOrder.includes(id));
  return [...known, ...unknown].map((certId) => ({
    certId,
    meta: getCert(certId)?.meta ?? null,
    attempts: groups.get(certId)!.slice().sort((x, y) => x.startedAt - y.startedAt),
  }));
}

/**
 * The account page body. localStorage is the source of truth, so every attempt read happens
 * in an effect (never in render) - that keeps the page SSR-safe and lets it render fully in
 * env-less, local-only mode. Supabase surfaces (sign-in prompt, trend, delete/export) appear
 * only when a project is configured. `session` is undefined while unknown so neither the
 * signed-out prompt nor the signed-in actions flash before auth state resolves. History is
 * grouped per cert; a single-cert user sees exactly today's UI (no section heading), and the
 * per-cert trend never mixes mocks across certs.
 */
export function AccountClient({ welcome }: { welcome: boolean }) {
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
      try {
        if (welcome && supabaseAvailable() && !syncedRef.current) {
          syncedRef.current = true;
          await fullSync();
          if (live) router.replace("/account");
        }
      } finally {
        // The history load must never hinge on sync outcome: fullSync honors a never-throws
        // contract today, but if a refactor ever breaks it, the page must not stick on Loading.
        if (live) setAttempts(readAll());
      }
    })();
    return () => {
      live = false;
    };
  }, [welcome, router]);

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
      if (supabase && userId) {
        // supabase-js v2 resolves with { error } rather than throwing - check it, or a failed
        // cloud delete silently masquerades as success (rows would resurface on next sign-in).
        const { error } = await supabase.from("attempts").delete().eq("user_id", userId);
        if (error) {
          console.warn("delete:", error);
          window.alert("Your cloud data could not be deleted right now - it may reappear when you next sign in. Local data was still cleared.");
        }
      }
    } catch (e) {
      console.warn("delete:", e); // network-level throw: same honest path as above
      window.alert("Your cloud data could not be deleted right now - it may reappear when you next sign in. Local data was still cleared.");
    }
    clearAll();
    setAttempts([]); // honest immediate feedback even if sign-out below is slow
    try {
      await supabase?.auth.signOut();
    } catch {
      /* signing out is best-effort - the local data is already gone */
    }
    router.push("/");
  }

  const sections = attempts ? groupByCert(attempts) : [];
  // Visual parity gate: a single-cert user (the only state today) sees no section heading, so
  // the page is byte-identical to before. Headings appear only once a second cert has attempts.
  const showHeadings = sections.length > 1;
  const hasAttempts = attempts !== null && attempts.length > 0;

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
      ) : attempts.length === 0 ? (
        // Empty history keeps the default cert's empty-state CTA (Quick 10) unchanged.
        <AttemptsList attempts={[]} meta={listCerts()[0]} />
      ) : (
        sections.map((s, idx) => (
          <Fragment key={s.certId}>
            {showHeadings && (
              <h3 style={idx === 0 ? H3 : { ...H3, marginTop: 44 }}>
                {s.meta ? `${s.meta.examCode} - ${s.meta.title}` : s.certId}
              </h3>
            )}
            {s.meta ? (
              <>
                <AttemptsList attempts={s.attempts} meta={s.meta} />
                {/* Trend is per cert (mocks never mix across certs) and, like the account
                    actions, is a signed-in surface. Its own <2-mocks hint renders here. */}
                {session && (
                  <div style={{ marginTop: 28 }}>
                    <TrendPanel attempts={s.attempts} meta={s.meta} />
                  </div>
                )}
              </>
            ) : (
              <div className="card">
                <p className="muted" style={{ margin: 0, fontSize: 14 }}>
                  {s.attempts.length} {s.attempts.length === 1 ? "attempt" : "attempts"} from a certification no longer available.
                </p>
              </div>
            )}
          </Fragment>
        ))
      )}

      {/* Account actions are global (export/delete span every cert) and only make sense once
          data exists - a fresh signed-in account otherwise stacks the empty-state CTA and
          delete-nothing. */}
      {session && hasAttempts && (
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
      )}
    </>
  );
}
