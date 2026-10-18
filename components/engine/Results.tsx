"use client";
import { useEffect, useRef, useState } from "react";
import type { Attempt, CertMeta, Question } from "@/lib/types";
import { FirstAnswerPerformance } from "@/components/FirstAnswerPerformance";
import { AnswerLearning } from "./AnswerLearning";
import { gradeAttempt } from "@/lib/scoring";
import { HEAVY_PAUSE_THRESHOLD, domainVerdict, type Verdict } from "@/lib/readiness";
import { VENDORS } from "@/components/ui/VendorDot";
import { DomainBars } from "@/components/ui/DomainBars";
import { optionPermutation, viewIndex } from "@/lib/permute";
import { certPath, practicePath } from "@/lib/routes";
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
// "L / text, L / text" for an index list (multi-select safe); empty picks read "Not answered".
// `indices` are canonical; `perm` maps them to the order the user actually saw, so the letters match
// the recap's displayed positions (and entries list top-to-bottom in that seen order).
export function answerLine(indices: number[], options: string[], perm: number[]): string {
  if (!indices.length) return "Not answered";
  return [...indices]
    .sort((a, b) => viewIndex(perm, a) - viewIndex(perm, b))
    .map((ci) => `${LETTERS[viewIndex(perm, ci)]} ${MIDDOT} ${options[ci]}`)
    .join(", ");
}

export function Results({ attempt, questions, meta }: { attempt: Attempt; questions: Question[]; meta: CertMeta }) {
  const g = gradeAttempt(attempt, questions);
  const passed = g.pct >= meta.passLinePct;

  // Domain rows (C10: the caller owns verdict + color, so DomainBars' internal fallbacks never fire).
  const domainRows = meta.domains
    .filter((d) => g.byDomain[d.name])
    .map((d) => {
      const v = g.byDomain[d.name];
      const pct = v.total ? Math.round((v.correct / v.total) * 100) : 0;
      const verdict = domainVerdict(pct, meta.passLinePct);
      return { name: d.name, correct: v.correct, total: v.total, verdict, color: VERDICT_COLORS[verdict], pct };
    });

  const needsPractice = [...domainRows].filter(d => d.pct < meta.passLinePct).sort((a, b) => a.pct - b.pct).slice(0, 2);
  const drillHref = (name: string) => `${practicePath(meta)}?mode=drill&domain=${encodeURIComponent(name)}`;
  const isDrill = attempt.mode === "drill";
  const sessionLabel = isDrill ? "Domain drill result" : attempt.mode === "quick" ? "Quick practice result" : attempt.mode === "retry" ? "Missed-question retry result" : attempt.reveal ? "Untimed study result" : "Full mock result";
  const targetLabel = meta.passLineOfficial === false ? "Study target" : "Practice target";
  const headline = passed ? `${targetLabel} met for this session.` : `Below your ${targetLabel.toLowerCase()} for this session.`;
  const missed = questions.filter(q => !attempt.results[q.id]?.correct);
  const retryCount = missed.filter(q => !q.excludedFromPractice).length;
  const unanswered = questions.filter(q => !attempt.results[q.id]?.chosen.length).length;
  const wrongCount = missed.length;
  const rightCount = questions.length - wrongCount;
  const incorrect = wrongCount - unanswered;
  const subcopy = wrongCount
    ? `Review ${wrongCount === 1 ? "the missed question" : "the missed questions"}, then ${passed ? "practice another domain" : "retry them to check your understanding"}.`
    : "Every question in this session was correct. Practice another domain or try a full mock for broader coverage.";
  const targetCopy = meta.passLineOfficial === false ? `Independent study target: ${meta.passLinePct}%.` : `Practice comparison threshold: ${meta.passLinePct}%.`;
  const scopeCopy = isDrill ? "This result covers this domain drill only; it does not measure overall exam readiness." : "This is a practice result, not a prediction of your exam outcome.";
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.parentElement?.scrollIntoView?.({ block: "start" });
  }, []);
  const recapRef = useRef<HTMLDetailsElement>(null);
  const [missedOnly, setMissedOnly] = useState(false);
  const openMissed = () => {
    setMissedOnly(true);
    if (recapRef.current) {
      recapRef.current.open = true;
      recapRef.current.querySelector("summary")?.focus({ preventScroll: true });
      recapRef.current.scrollIntoView?.({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="results">
      <h2 className="sr-only">Results</h2>

      <header className="result-masthead"><span className="eyebrow">{meta.examCode} / SESSION REPORT</span><h1 ref={headingRef} tabIndex={-1}>{isDrill ? "Drill complete." : attempt.mode === "retry" ? "Retry complete." : attempt.mode === "quick" ? "Practice complete." : "Session complete."}</h1></header>
      <section className="result-hero" aria-label={sessionLabel}>
        <div className="result-score" role="img" aria-label={`${g.pct}%, ${g.score} of ${g.total} correct`}>
          <div className="result-percentage" aria-hidden="true">{g.pct}<span>%</span></div>
          <div className="result-score-caption">{g.score} / {g.total} correct</div>
        </div>
        <div className="result-copy">
          <span className="eyebrow">{sessionLabel}</span>
          <h3 className="r-verdict">{headline}</h3>
          {isDrill && <p className="result-domain">{attempt.domain ?? domainRows[0]?.name}</p>}
          <p className="result-counts">{rightCount} correct {MIDDOT} {incorrect} incorrect{unanswered > 0 ? ` ${MIDDOT} ${unanswered} unanswered` : ""}</p>
          <p className="r-sub">{targetCopy} {subcopy}</p>
          {attempt.pauseCount >= 1 && (
            <div className="pausestamp">Paused {attempt.pauseCount}x{attempt.pauseCount >= HEAVY_PAUSE_THRESHOLD && " - timing may not reflect exam conditions"}</div>
          )}
        </div>
      </section>

      {questions.length <= 12 && <div className="result-answer-log" aria-hidden="true">{questions.map((q, i) => <span key={q.id} className={attempt.results[q.id]?.correct ? "hit" : "miss"}>{attempt.results[q.id]?.correct ? CHECK : CROSS}<small>{String(i + 1).padStart(2, "0")}</small></span>)}</div>}
      <div className="result-actions">
        {wrongCount > 0 && <button type="button" className="btn btn-primary" onClick={openMissed}>Review {wrongCount} missed {wrongCount === 1 ? "question" : "questions"}</button>}
        <a className={`btn ${wrongCount ? "btn-ghost" : "btn-primary"}`} href={`${certPath(meta)}#domains`}>{isDrill ? "Choose another domain" : "Choose a domain to practice"}</a>
        {retryCount > 0 && <a className="btn btn-ghost" href={`${practicePath(meta)}?mode=retry&from=${encodeURIComponent(attempt.attemptId)}`}>Retry {retryCount} missed {retryCount === 1 ? "question" : "questions"}</a>}
      </div>
      {wrongCount > 0 && <p className="result-note">Missed questions include incorrect and unanswered questions. Retry includes only active questions from this session.</p>}

      <FirstAnswerPerformance meta={meta} attempt={attempt} />
      {!isDrill && domainRows.length > 0 && <div className="panel result-breakdown"><DomainBars title="Performance by domain" rows={domainRows} /></div>}
      {needsPractice.length > 0 && (
        <section className="result-recommendations" aria-label="Suggested practice">
          <h4 className="eyebrow">{isDrill ? "More practice in this domain" : "Domains below your practice target"}</h4>
          {needsPractice.map(d => <a className="result-domain-link" key={d.name} href={drillHref(d.name)} aria-label={`Practice ${d.name} domain`}>
            <span>{d.name}<small>{d.correct}/{d.total} correct in this session</small></span><span>Practice {ARROW}</span>
          </a>)}
        </section>
      )}
      <p className="result-note">{scopeCopy}{meta.certId === "aip-c01" && " This practice percentage does not convert to AWS's 750/1000 scaled passing score."}</p>
      <p className="result-back"><a href={certPath(meta)}>Back to certification</a></p>

      {/* Review answers: collapsed by default (the whole screen stays short). Opening it surfaces the
          misses expanded (open={!ok}) so a wrong answer is never buried once a learner opts in. */}
      <details ref={recapRef} id="answer-review" className="recap-collapse">
        <summary
          style={{
            display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", listStyle: "none",
            fontFamily: "var(--font-display)", fontSize: "16px", fontWeight: 700,
            border: "1px solid var(--line)", background: "var(--panel)",
            borderRadius: "var(--radius)", padding: "16px 20px",
          }}
        >
          <span>Review answers</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--muted)", fontWeight: 400 }}>
            {rightCount} correct {MIDDOT} {wrongCount} missed
          </span>
          <span style={{ flex: 1 }} />
          <span className="recap-chevron" aria-hidden="true">{CHEVRON}</span>
        </summary>

        <div className="recap">
          {wrongCount > 0 && <div className="result-review-filter">
            <button type="button" className="btn btn-ghost" aria-pressed={missedOnly} onClick={() => setMissedOnly(o => !o)}>{missedOnly ? `Show all ${questions.length} answers` : `Show only ${wrongCount} missed`}</button>
          </div>}
          {questions.map((q, i) => {
            const r = attempt.results[q.id];
            const ok = r?.correct ?? false;
            if (missedOnly && ok) return null;
            const chosen = r?.chosen ?? [];
            // Replay the exact per-attempt shuffle the engine showed (same seed: attemptId + q.id), so
            // the recap - and the "Your answer / Correct" letters - match the order the user saw.
            const perm = optionPermutation(attempt.attemptId, q.id, q.options.length);
            // Once the section is open, a miss opens with it (correct answers stay collapsed) so it is
            // never buried behind a second click.
            return (
              <details className="recap-item" key={q.id} open={!ok}>
                <summary className="recap-summary">
                  <span className={`ri ${ok ? "ok" : "no"}`} aria-label={ok ? "correct" : !chosen.length ? "unanswered" : "incorrect"}>{ok ? CHECK : CROSS}</span>
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
                  {q.excludedFromPractice && (
                    <p className="muted">Archived question: excluded from new practice after review. {q.exclusionReason}</p>
                  )}
                  <AnswerLearning question={q} certId={meta.certId} vendorSlug={meta.vendorSlug} attemptId={attempt.attemptId} chosen={chosen} className="recap-explain" showCorrect={false} />
                  <a className="doclink" href={q.docUrl} target="_blank" rel="noopener noreferrer">
                    Read the {VENDORS[meta.vendorSlug]?.n ?? meta.vendor} docs {ARROW}
                  </a>
                </div>
              </details>
            );
          })}
        </div>
      </details>
    </div>
  );
}
