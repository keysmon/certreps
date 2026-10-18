"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ExamEngine } from "@/components/engine/ExamEngine";
import { getMeta, getBank, isResumableAttempt } from "@/lib/bank";
import { practicePath, resumeParams } from "@/lib/routes";
import { attemptLabel } from "@/lib/labels";
import { listInProgress, discardAttempt } from "@/lib/storage";
import type { Attempt, CertMeta, Mode } from "@/lib/types";

const MODES: Mode[] = ["quick", "drill", "mock", "retry"];
// Glyph via fromCharCode (ASCII-source convention, see the engine + detail page).
const DOT = String.fromCharCode(183); // U+00B7 middle dot

/**
 * Practice surface wrapper. It NEVER modifies the engine - it only decides, before the engine
 * mounts, whether to interpose a resume chooser. When the URL carries an explicit ?resume=<id>
 * (a resume link from the detail page or dashboard), the engine adopts that id exactly as today.
 * When the URL has NO resume param but a same-mode unfinished attempt exists (for drills: same
 * domain too), we render the chooser instead of a fresh engine, so starting a bare practice URL
 * can no longer silently orphan an in-progress session. Resume re-navigates with resume=<id>;
 * Start fresh mounts a fresh engine (new attempt, old one left intact); Discard deletes the row
 * then starts fresh.
 */
export function PracticeClient({ certId }: { certId: string }) {
  const params = useSearchParams();
  const modeParam = params.get("mode") ?? "quick";
  const mode: Mode = (MODES as string[]).includes(modeParam) ? (modeParam as Mode) : "quick";
  const domain = params.get("domain") ?? undefined;
  const resume = params.get("resume") ?? undefined;
  const retryFrom = mode === "retry" ? params.get("from") ?? undefined : undefined;
  const reveal = mode === "mock" && params.get("reveal") === "1";

  // A Start fresh decision belongs only to the current URL context. Reset the gate before
  // mounting another mode/domain/study session so it cannot orphan that session's saved attempt.
  return <PracticeSession key={JSON.stringify([certId, mode, domain, resume, reveal, retryFrom])} certId={certId} mode={mode} domain={domain} resume={resume} reveal={reveal} retryFrom={retryFrom} />;
}

function PracticeSession({ certId, mode, domain, resume, reveal, retryFrom }: {
  certId: string;
  mode: Mode;
  domain?: string;
  resume?: string;
  reveal: boolean;
  retryFrom?: string;
}) {
  // Interstitial gate (SSR-safe): the in-progress lookup reads localStorage, so it runs in an effect
  // (never in render or a useState initializer - the hydration lesson) and the first paint is the
  // loading shell. `checked` flips once the effect has resolved whether a resumable attempt exists.
  const [checked, setChecked] = useState(false);
  const [inProgress, setInProgress] = useState<Attempt | null>(null);
  const [startFresh, setStartFresh] = useState(false);

  useEffect(() => {
    if (resume || retryFrom) return; // an explicit resume link bypasses the chooser; the engine adopts the id
    const match = listInProgress(certId).find(
      (a) => isResumableAttempt(a, getBank(certId), { certId, mode, domain, reveal }),
    );
    setInProgress(match ?? null);
    setChecked(true);
  }, [certId, mode, domain, reveal, resume, retryFrom]);

  // Engine contract preserved: key by mode+domain+reveal+resume so a changed resume id (or a switch
  // between exam and study runs) forces a clean remount.
  const engine = (resumeId?: string) => (
    <ExamEngine
      key={`${mode}-${domain ?? ""}-${reveal ? "r" : ""}-${resumeId ?? ""}`}
      certId={certId}
      mode={mode}
      domain={domain}
      reveal={reveal}
      resumeAttemptId={resumeId}
      retryFrom={retryFrom}
    />
  );

  // Explicit resume link -> mount the engine directly (today's adopt-by-id path).
  if (resume) return engine(resume);
  // A result-page retry explicitly starts a new session for that result, not unrelated saved retries.
  if (retryFrom) return engine();
  // Pre-check paint matches the page Suspense fallback + the engine's own shell (no hydration flash).
  if (!checked) return <p className="stage">Loading...</p>;
  // Nothing to resume, or the user chose to start fresh -> mount the engine fresh (new attempt).
  if (startFresh || !inProgress) return engine();

  return (
    <PracticeInterstitial
      attempt={inProgress}
      meta={getMeta(certId)}
      onFresh={() => setStartFresh(true)}
      onDiscard={() => {
        // Only ever an unfinished attempt (listInProgress) - discardAttempt's resurrection-safety
        // invariant holds. Then fall through to a fresh engine mount.
        discardAttempt(inProgress.attemptId);
        setStartFresh(true);
      }}
    />
  );
}

/**
 * Pre-engine chooser shown when a resumable same-mode attempt exists. Resume is a Link to the same
 * URL with resume=<id> (so the wrapper's resume branch adopts it); Start fresh / Discard are local
 * flips that never navigate (a bare re-navigation would just re-surface this chooser). Discard is a
 * two-step inline confirm - no blocking browser dialog. Reuses the engine's .stage/.card/.btn chrome.
 */
function PracticeInterstitial({
  attempt,
  meta,
  onFresh,
  onDiscard,
}: {
  attempt: Attempt;
  meta: CertMeta;
  onFresh: () => void;
  onDiscard: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  // Count a question answered only when a CHOICE was recorded: a flagged-but-unanswered mock
  // question now carries a legitimate empty-chosen row, which must not inflate "n of m answered".
  const answered = Object.values(attempt.results).filter((r) => r.chosen.length > 0).length;
  const total = attempt.questionIds.length;
  const label = attemptLabel(attempt.mode, attempt.reveal);

  const resumeHref = `${practicePath(meta)}?${resumeParams(attempt)}`;

  return (
    <div className="stage">
      <div className="card" style={{ maxWidth: 520, margin: "48px auto", textAlign: "center" }}>
        <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>You have a {label} in progress</h2>
        <p className="muted" style={{ margin: "0 0 22px" }}>
          {answered} of {total} answered
          {attempt.domain ? ` ${DOT} ${attempt.domain}` : ""}. Resume where you left off, or start a fresh session.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Link className="btn btn-primary" href={resumeHref}>
            Resume
          </Link>
          <button type="button" className="btn btn-ghost" onClick={onFresh}>
            Start fresh
          </button>
          {confirming ? (
            <>
              <button
                type="button"
                className="btn btn-danger"
                onClick={onDiscard}
                aria-label={`Discard this ${label} in progress`}
              >
                Discard it
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setConfirming(false)}>
                Keep it
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={() => setConfirming(true)}>
              Discard
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
