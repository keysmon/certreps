"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Attempt, CertMeta } from "@/lib/types";
import { getSupabase } from "@/lib/supabase/client";
import { fullSync } from "@/lib/sync-runtime";
import { readAll, listInProgress } from "@/lib/storage";
import { useSession } from "@/lib/supabase/useSession";
import { useAttemptRevision } from "@/lib/useAttemptRevision";
import { isResumableAttempt } from "@/lib/bank";
import { listCerts, getCert } from "@/lib/certs";
import { certPath, practicePath, resumeParams } from "@/lib/routes";
import { attemptLabel } from "@/lib/labels";
import { gradeAttempt } from "@/lib/scoring";
import { questionsByIds } from "@/lib/sampler";
import { progressView, domainReadiness } from "@/lib/progress-view";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { VendorDot, VENDORS } from "@/components/ui/VendorDot";
import "./account.css";

// Glyphs via fromCharCode (craft convention, see Results.tsx) so the source stays ASCII-clean.
const ARROW = String.fromCharCode(8594);
const MIDDOT = String.fromCharCode(183);

function vendorColor(slug: string): string {
  return VENDORS[slug]?.c ?? "var(--gold)";
}
function vendorName(slug: string): string {
  return VENDORS[slug]?.n ?? slug;
}

// Relative day/week stamp (matches the design's coarse buckets - exact times live on the replay page).
function rel(ts: number): string {
  const d = (Date.now() - ts) / 86_400_000;
  if (d < 1) return "today";
  if (d < 2) return "yesterday";
  if (d < 7) return `${Math.floor(d)}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}

interface CardView {
  certId: string;
  meta: CertMeta;
  bestPct: number;
  weakLabel: string;
  lastActivity: number;
  resumeHref: string;
  resumeLabel: string;
  // Older unfinished sessions for this cert (newest keeps the primary CTA above). Empty for the
  // common single-session case; each renders as a small resume link so no in-progress attempt hides.
  resumeExtras: { href: string; text: string }[];
  drillHref: string | null;
}

interface RecentRow {
  attemptId: string;
  certId: string;
  meta: CertMeta;
  mode: string;
  pct: number;
  correct: number;
  total: number;
  ts: number;
  passLine: number;
}

interface DashboardView {
  stats: { inProgress: number; practiced: number; best: number; ready: number };
  cards: CardView[];
  activity: RecentRow[];
  orphanCount: number;
}

/**
 * Derive the whole dashboard from the flat attempt store. Everything renders from certs still in
 * the registry (grading needs their bank); attempts from a removed cert are counted only as an
 * honest "no longer available" footnote. Readiness (best mock %, study target met, weakest domain) comes
 * from lib/progress-view - the SAME mock-only semantics as the catalog card and detail ring, so the
 * dashboard can never contradict them. Best score spans every finished attempt (any mode); questions
 * practiced counts answered questions. Called only client-side (progress-view reads localStorage).
 */
// A question is answered only when a choice was recorded. A flagged-but-unanswered mock question
// carries a legitimate empty-chosen result row (v1h), which must NOT inflate the practiced tally or
// the "n of m answered" resume links - count recorded choices (chosen.length > 0), not bare rows.
const answeredCount = (a: Attempt): number =>
  Object.values(a.results).filter((r) => r.chosen.length > 0).length;

function computeView(attempts: Attempt[]): DashboardView {
  const byCert = new Map<string, Attempt[]>();
  for (const a of attempts) {
    const l = byCert.get(a.certId);
    if (l) l.push(a);
    else byCert.set(a.certId, [a]);
  }
  const registryOrder = listCerts().map((m) => m.certId);
  const knownIds = registryOrder.filter((id) => byCert.has(id));
  const orphanCount = attempts.reduce((n, a) => (getCert(a.certId) ? n : n + 1), 0);
  const practiced = attempts.reduce((n, a) => n + answeredCount(a), 0);

  const cards: CardView[] = [];
  const activity: RecentRow[] = [];
  let readyCount = 0;
  let inProgressCount = 0;
  let best = 0;

  for (const certId of knownIds) {
    const cert = getCert(certId)!;
    const meta = cert.meta;
    const certAttempts = byCert.get(certId)!;

    const pv = progressView(certId, meta.passLinePct);
    if (pv.status === "Ready") readyCount += 1;
    if (pv.status === "In progress") inProgressCount += 1;

    // Weakest domain via the C10 read (recency-first mock verdicts). Empty until a finished mock exists.
    const read = domainReadiness(certId, meta.passLinePct);
    const domainRows = meta.domains
      .filter((d) => read.domains[d.name])
      .map((d) => ({ name: d.name, pct: read.domains[d.name].pct }));
    const weakest = domainRows.reduce<(typeof domainRows)[number] | null>(
      (lo, r) => (lo == null || r.pct < lo.pct ? r : lo),
      null,
    );
    const weakLabel = weakest
      ? `Weakest: ${weakest.name.split(" ").slice(0, 3).join(" ")} ${MIDDOT} ${weakest.pct}%`
      : "Just getting started";

    const base = practicePath(meta);
    // One read powers both the primary CTA (newest) and the older-session links (the rest), so the
    // card can never contradict itself. listInProgress[0] is the same attempt getInProgress returned.
    const inProgress = listInProgress(certId).filter((a) => isResumableAttempt(a, cert.bank));
    const inProg = inProgress[0] ?? null;
    const resumeHref = inProg ? `${base}?${resumeParams(inProg)}` : `${base}?mode=quick`;
    const resumeExtras = inProgress.slice(1).map((a) => {
      const answered = answeredCount(a);
      const label = attemptLabel(a.mode, a.reveal);
      return {
        href: `${base}?${resumeParams(a)}`,
        text: `Resume ${label} ${MIDDOT} ${answered} of ${a.questionIds.length} answered${a.domain ? ` ${MIDDOT} ${a.domain}` : ""}`,
      };
    });
    const drillHref = weakest ? `${base}?mode=drill&domain=${encodeURIComponent(weakest.name)}` : null;

    cards.push({
      certId,
      meta,
      bestPct: pv.bestMockPct,
      weakLabel,
      lastActivity: Math.max(...certAttempts.map((a) => a.startedAt)),
      resumeHref,
      resumeLabel: inProg ? "Resume" : "Practice",
      resumeExtras,
      drillHref,
    });

    for (const a of certAttempts) {
      if (a.finishedAt === null) continue;
      const g = gradeAttempt(a, questionsByIds(cert.bank, a.questionIds));
      if (g.pct > best) best = g.pct;
      activity.push({
        attemptId: a.attemptId,
        certId,
        meta,
        mode: attemptLabel(a.mode, a.reveal),
        pct: g.pct,
        correct: g.score,
        total: g.total,
        ts: a.finishedAt,
        passLine: meta.passLinePct,
      });
    }
  }

  cards.sort((x, y) => y.lastActivity - x.lastActivity);
  activity.sort((x, y) => y.ts - x.ts);

  return {
    stats: { inProgress: inProgressCount, practiced, best, ready: readyCount },
    cards,
    activity: activity.slice(0, 10),
    orphanCount,
  };
}

function Stat({ v, l }: { v: string | number; l: string }) {
  return (
    <div className="pg-stat">
      <div className="sv">{v}</div>
      <div className="sl">{l}</div>
    </div>
  );
}

function ContinueCard({ card }: { card: CardView }) {
  const accent = vendorColor(card.meta.vendorSlug);
  return (
    <div className="pg-ccard">
      <span className="accent" style={{ background: accent }} aria-hidden="true" />
      <ScoreRing pct={card.bestPct} size={76} stroke={6} passLine={card.meta.passLinePct} />
      <div className="info">
        <div className="vn">
          <VendorDot color={accent} size={8} />
          {vendorName(card.meta.vendorSlug)} {MIDDOT} {card.meta.examCode}
        </div>
        <h3>{card.meta.title}</h3>
        <div className="sub">
          {card.weakLabel} {MIDDOT} last studied {rel(card.lastActivity)}
        </div>
        <div className="acts">
          <Link className="btn btn-primary btn-sm" href={card.resumeHref}>
            {card.resumeLabel} {ARROW}
          </Link>
          {card.drillHref && (
            <Link className="btn btn-ghost btn-sm" href={card.drillHref}>
              Drill weakest
            </Link>
          )}
          <Link className="btn btn-ghost btn-sm" href={certPath(card.meta)}>
            Details
          </Link>
        </div>
        {card.resumeExtras.length > 0 && (
          <ul className="pg-resume-more">
            {card.resumeExtras.map((ex) => (
              <li key={ex.href}>
                <Link href={ex.href}>{ex.text}</Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ActivityItem({ row }: { row: RecentRow }) {
  const accent = vendorColor(row.meta.vendorSlug);
  const col = row.pct >= row.passLine ? "var(--emerald)" : row.pct >= 50 ? "var(--gold)" : "var(--rose)";
  return (
    <Link className="pg-act" href={`/account/attempts/${row.attemptId}`}>
      <span className="ad" style={{ background: accent }} aria-hidden="true" />
      <span className="amode">{row.mode}</span>
      <span className="an">{row.meta.title}</span>
      <span className="asc" style={{ color: col }}>{row.pct}%</span>
      <span className="acount">{row.correct}/{row.total}</span>
      <span className="awhen">{rel(row.ts)}</span>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="pg-empty">
      <div className="glyph" aria-hidden="true">
        <svg viewBox="0 0 32 32" width="34" height="34">
          <circle cx="16" cy="16" r="8.5" fill="none" stroke="var(--gold)" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="30 25" transform="rotate(-35 16 16)" />
        </svg>
      </div>
      <div className="big">No practice yet</div>
      <p className="muted">
        Practice to record your scores. Complete a full mock to see readiness and weak areas.
      </p>
      <Link className="btn btn-primary" href="/catalog">
        Browse certifications {ARROW}
      </Link>
    </div>
  );
}

/**
 * The My Progress dashboard. localStorage is the source of truth, so attempts load in an effect
 * (never in render) - the page stays SSR-safe and renders in env-less, local-only mode. The sync
 * banner is a signed-in surface (Supabase configured); `session` stays undefined until auth resolves
 * so neither banner state flashes. Signed-in visits, focus and reconnect pull cloud history;
 * overlapping pulls coalesce, and welcome=1 is removed after post-login reconciliation.
 * Destructive actions (export/delete) live on Settings now.
 */
export function AccountClient({ welcome }: { welcome: boolean }) {
  const router = useRouter();
  const revision = useAttemptRevision();
  const { session: checkedSession, available, loading, error: sessionError } = useSession();
  const session = loading ? undefined : checkedSession;
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);
  const syncInFlight = useRef<{ userId: string; promise: Promise<void> } | null>(null);
  const userId = session?.user.id;
  const refreshCloud = useCallback((accountId: string): Promise<void> => {
    if (syncInFlight.current?.userId === accountId) return syncInFlight.current.promise;
    const promise = fullSync()
      .catch((error) => { console.warn("sync:", error); })
      .finally(() => {
        if (syncInFlight.current?.promise === promise) syncInFlight.current = null;
      });
    syncInFlight.current = { userId: accountId, promise };
    return promise;
  }, []);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError(null);
    try {
      const client = getSupabase();
      if (!client) throw new Error("Account unavailable");
      const result = await client.auth.signOut();
      if (result.error) throw result.error;
    } catch {
      setSignOutError("Could not sign out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  // A returning signed-in device must pull cloud history on normal visits too.
  // Local store events only refresh rendering; they never trigger another cloud pull.
  useEffect(() => {
    if (!available || !userId) return;
    let live = true;
    const refresh = () => {
      void refreshCloud(userId).then(() => {
        if (live) setAttempts(readAll());
      });
    };
    const onVisible = () => { if (!document.hidden) refresh(); };
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    window.addEventListener("pageshow", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      live = false;
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      window.removeEventListener("pageshow", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [available, userId, refreshCloud]);

  // Post-login navigation shares the same in-flight pull as the normal visit.
  useEffect(() => {
    if (!welcome || !available || !userId) return;
    let live = true;
    void refreshCloud(userId).then(() => {
      if (live) router.replace("/account");
    });
    return () => { live = false; };
  }, [welcome, available, userId, refreshCloud, router]);

  // Store refreshes must not cancel an in-flight post-login sync/navigation.
  useEffect(() => {
    setAttempts(readAll());
  }, [revision]);

  const view = attempts ? computeView(attempts) : null;
  const hasAttempts = attempts !== null && attempts.length > 0;
  const email = session?.user.email ?? undefined;

  return (
    <main className="pg-wrap">
      <span className="pg-eyebrow">
        {session && email ? `Signed in as ${email}` : "Progress saved on this device"}
      </span>
      <h1 className="pg-h1">Your progress</h1>
      {sessionError && <p role="alert">{sessionError} Local progress is still available.</p>}
      {session && signOutError && <p role="alert">{signOutError}</p>}

      {available &&
        session !== undefined &&
        (session ? (
          <div className="pg-banner emerald">
            <span className="dot" style={{ background: "var(--emerald)" }} aria-hidden="true" />
            <div className="body">
              <div className="bt">Account backup enabled</div>
              <div className="bs">
                Your completed attempts can sync across devices while you are signed in{email ? ` as ${email}` : ""}.
              </div>
            </div>
            <button type="button" className="pg-signout" disabled={signingOut} onClick={signOut}>
              Sign out
            </button>
          </div>
        ) : (
          <div className="pg-banner gold">
            <span className="dot" style={{ background: "var(--gold)" }} aria-hidden="true" />
            <div className="body">
              <div className="bt">Progress is saved on this device</div>
              <div className="bs">Sign in to back up completed attempts across devices.</div>
            </div>
            <Link className="btn btn-primary btn-sm" href="/login">
              Sign in to sync
            </Link>
          </div>
        ))}

      {attempts === null ? (
        <p className="muted" style={{ marginTop: 24 }}>Loading your progress...</p>
      ) : !hasAttempts ? (
        <EmptyState />
      ) : view && view.cards.length === 0 ? (
        // Every attempt is from a cert no longer in the registry - nothing to grade, so say so plainly.
        <p className="pg-orphan">
          {view.orphanCount} {view.orphanCount === 1 ? "attempt" : "attempts"} from certifications no longer available.
        </p>
      ) : view ? (
        <>
          <div className="pg-statstrip">
            <Stat v={view.stats.inProgress} l="Certs in progress" />
            <Stat v={view.stats.practiced} l="Questions practiced" />
            <Stat v={`${view.stats.best}%`} l="Best score" />
            <Stat v={view.stats.ready} l="Study target met" />
          </div>

          <div className="pg-sechead">
            <h2 className="pg-sectitle">Continue studying</h2>
            <Link className="pg-browse" href="/catalog">
              Browse all certs {ARROW}
            </Link>
          </div>
          <div className="pg-grid2">
            {view.cards.map((c) => (
              <ContinueCard key={c.certId} card={c} />
            ))}
          </div>

          <div className="pg-sechead" style={{ marginTop: 34 }}>
            <h2 className="pg-sectitle">Recent activity</h2>
          </div>
          <div className="pg-panel">
            {view.activity.length ? (
              view.activity.map((r) => <ActivityItem key={r.attemptId} row={r} />)
            ) : (
              <div className="pg-act">
                <span className="empty">No finished sessions yet.</span>
              </div>
            )}
          </div>

          {view.orphanCount > 0 && (
            <p className="pg-orphan">
              {view.orphanCount} {view.orphanCount === 1 ? "attempt" : "attempts"} from certifications no longer available.
            </p>
          )}
        </>
      ) : null}
    </main>
  );
}
