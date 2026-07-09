"use client";
import type { Attempt, CertMeta, Question } from "@/lib/types";
import { gradeAttempt } from "@/lib/scoring";
import { HEAVY_PAUSE_THRESHOLD, domainVerdict, type Verdict } from "@/lib/readiness";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { DomainBars } from "@/components/ui/DomainBars";
import { optionPermutation, viewIndex } from "@/lib/permute";
import "./engine.css";

const LETTERS = ["A", "B", "C", "D", "E"];
const CHECK = String.fromCharCode(10003);
const CROSS = String.fromCharCode(10007);
const ARROW = String.fromCharCode(8594);
const CHEVRON = String.fromCharCode(8250);
const MIDDOT = String.fromCharCode(183);

// Single source of truth for band colors (contract C10: banding lives in domainVerdict, never inline).
const VERDICT_COLORS: Record<Verdict, string> = {
  above: "var(--emerald)",
  borderline: "var(--gold)",
  weak: "var(--rose)",
};

// Total elapsed, human-scaled: seconds under a minute (a fast drill), minutes under an hour,
// h+m for a full mock. Kept honest across the range instead of the design's minutes-only "Xm",
// which reads oddly for a two-hour mock.
function formatTotal(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.round(sec / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

// "L / text, L / text" for an index list (multi-select safe); empty picks read "Not answered".
// `indices` are canonical; `perm` maps them to the order the user actually saw, so the letters match
// the recap's displayed positions (and entries list top-to-bottom in that seen order).
function answerLine(indices: number[], options: string[], perm: number[]): string {
  if (!indices.length) return "Not answered";
  return [...indices]
    .sort((a, b) => viewIndex(perm, a) - viewIndex(perm, b))
    .map((ci) => `${LETTERS[viewIndex(perm, ci)]} ${MIDDOT} ${options[ci]}`)
    .join(", ");
}

export function Results({ attempt, questions, meta }: { attempt: Attempt; questions: Question[]; meta: CertMeta }) {
  const g = gradeAttempt(attempt, questions);
  const passed = g.pct >= meta.passLinePct;

  // Best streak: the longest run of consecutive-correct answers in question order. A pure render
  // derivation from attempt.results (an unanswered question breaks the run) - no state, no storage.
  let bestStreak = 0;
  let run = 0;
  for (const q of questions) {
    if (attempt.results[q.id]?.correct) {
      run += 1;
      if (run > bestStreak) bestStreak = run;
    } else {
      run = 0;
    }
  }

  // Domain rows (C10: the caller owns verdict + color, so DomainBars' internal fallbacks never fire).
  const domainRows = meta.domains
    .filter((d) => g.byDomain[d.name])
    .map((d) => {
      const v = g.byDomain[d.name];
      const pct = v.total ? Math.round((v.correct / v.total) * 100) : 0;
      const verdict = domainVerdict(pct, meta.passLinePct);
      return { name: d.name, correct: v.correct, total: v.total, verdict, color: VERDICT_COLORS[verdict], pct };
    });

  // Weakest = lowest accuracy among the domains that appeared; drives the "Drill weakest" link.
  const weakest = domainRows.reduce<(typeof domainRows)[number] | null>(
    (lo, r) => (lo == null || r.pct < lo.pct ? r : lo),
    null,
  );
  const drillHref = weakest
    ? `/aws/${meta.certId}/practice?mode=drill&domain=${encodeURIComponent(weakest.name)}`
    : `/aws/${meta.certId}/practice?mode=drill`;

  // Verdict headline + subcopy, banded by OUR pass line (top boundary = passLinePct; the lower
  // boundary is 50 = "half correct"). Plain dashes only - no em dashes (craft rule).
  const headline = passed
    ? "Above the pass line - keep it up."
    : g.pct >= 50
    ? "Getting there - a couple of soft spots."
    : "Early days - this is exactly what practice is for.";
  const subcopy = passed
    ? `Pass line is ~${meta.passLinePct}%. Two clean runs above this and you are ready to book.`
    : `Pass line is ~${meta.passLinePct}%. Drill your weakest domain below, then run it again.`;

  return (
    <div className="results">
      <h2 className="sr-only">Results</h2>

      <div className="r-head">
        <div className="r-ringcol">
          <ScoreRing pct={g.pct} size={184} correct={g.score} total={g.total} passLine={meta.passLinePct} />
        </div>
        <div>
          <span className="eyebrow">Readiness read</span>
          <h3 className="r-verdict">{headline}</h3>
          <p className="r-sub">{subcopy}</p>

          {attempt.pauseCount >= 1 && (
            <div className="pausestamp">
              Paused {attempt.pauseCount}x
              {attempt.pauseCount >= HEAVY_PAUSE_THRESHOLD && " - timing may not reflect exam conditions"}
            </div>
          )}

          <div className="r-stats">
            <div className="stat"><div className="sv">{g.avgSecPerQuestion}s</div><div className="sl">Avg / question</div></div>
            <div className="stat"><div className="sv">{bestStreak}</div><div className="sl">Best streak</div></div>
            <div className="stat"><div className="sv">{formatTotal(attempt.elapsedSec)}</div><div className="sl">Total time</div></div>
          </div>
        </div>
      </div>

      <div className="r-cols">
        <div className="panel">
          <h4>Performance by domain</h4>
          <DomainBars title="" rows={domainRows} />
        </div>
        <div className="panel r-next">
          <div className="r-next-h">Do this next</div>
          <div className="r-next-list">
            <a className="btn btn-primary btn-sm" href={drillHref}>Drill weakest domain</a>
            <a className="btn btn-ghost btn-sm" href={`/aws/${meta.certId}/practice?mode=retry`}>Retry my missed questions</a>
            <a className="btn btn-ghost btn-sm" href={`/aws/${meta.certId}`}>Back to certification</a>
          </div>
        </div>
      </div>

      <div className="recap">
        <h3>Review every question</h3>
        {questions.map((q, i) => {
          const r = attempt.results[q.id];
          const ok = r?.correct ?? false;
          const chosen = r?.chosen ?? [];
          // Replay the exact per-attempt shuffle the engine showed (same seed: attemptId + q.id), so
          // the recap - and the "Your answer / Correct" letters - match the order the user saw.
          const perm = optionPermutation(attempt.attemptId, q.id, q.options.length);
          // Wrong answers open by default so a miss is never buried behind a click (additive `open`
          // attribute; correct answers stay collapsed).
          return (
            <details className="recap-item" key={q.id} open={!ok}>
              <summary className="recap-summary">
                <span className={`ri ${ok ? "ok" : "no"}`} aria-label={ok ? "correct" : "incorrect"}>{ok ? CHECK : CROSS}</span>
                <span className="rq">Q{i + 1} - {q.stem}</span>
                <span className="rd">{q.tag}</span>
                <span className="recap-chevron" aria-hidden="true">{CHEVRON}</span>
              </summary>
              <div className="recap-body">
                {/* Derived textual summary (additive): the chosen answer, and - only when wrong -
                    the correct one. Multi-select safe (lists every index). */}
                <p className="recap-answer">
                  <span className="ra-label">Your answer:</span> {answerLine(chosen, q.options, perm)}
                  {!ok && (
                    <>
                      <br />
                      <span className="ra-label ra-correct">Correct:</span> {answerLine(q.correct, q.options, perm)}
                    </>
                  )}
                </p>
                {/* Read-only replay of the graded options (mirrors QuestionCard's graded state): the
                    key(s) carry .correct, a wrong pick carries .incorrect, everything else dims. */}
                <div className="options">
                  {perm.map((ci, vi) => {
                    const text = q.options[ci];
                    const isKey = q.correct.includes(ci);
                    const wasChosen = chosen.includes(ci);
                    const cls = isKey ? "option correct" : wasChosen ? "option incorrect" : "option dim";
                    return (
                      <div key={ci} className={cls}>
                        <span className="marker">{isKey ? CHECK : wasChosen ? CROSS : LETTERS[vi]}</span>
                        <span>{text}</span>
                      </div>
                    );
                  })}
                </div>
                {/* Safe: trusted build-time content from our own pipeline (<b>/<em> only), never user input. */}
                <p className="recap-explain" dangerouslySetInnerHTML={{ __html: q.explanation }} />
                <a className="doclink" href={q.docUrl} target="_blank" rel="noopener noreferrer">
                  Read the AWS docs {ARROW}
                </a>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
