"use client";
import type { Attempt, CertMeta, Question } from "@/lib/types";
import { gradeAttempt } from "@/lib/scoring";
import { HEAVY_PAUSE_THRESHOLD, domainVerdict, type Verdict } from "@/lib/readiness";
import { ScoreRing } from "@/components/ui/ScoreRing";
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
const VERDICT_LABELS: Record<Verdict, string> = {
  above: "Above",
  borderline: "Borderline",
  weak: "Weak",
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

  // The redesign's "drill these two next": the two lowest-accuracy domains that appeared. A single-
  // domain drill yields one row, so we take up to two rather than assuming a multi-domain mock.
  const weakestTwo = [...domainRows].sort((a, b) => a.pct - b.pct).slice(0, 2);
  const drillHref = (name: string) => `${practicePath(meta)}?mode=drill&domain=${encodeURIComponent(name)}`;

  // Verdict headline + subcopy, banded by OUR pass line (top boundary = passLinePct; the lower
  // boundary is 50 = "half correct"). Plain dashes only - no em dashes (craft rule).
  // An independent practice threshold must be described as a study target, including
  // AIP-C01 where the official scaled score is not a raw accuracy percentage.
  const officialPassLine = meta.passLineOfficial !== false;
  const headline = passed
    ? officialPassLine
      ? "Above the pass line - keep it up."
      : "Above your study target - keep it up."
    : g.pct >= 50
    ? "Getting there - a couple of soft spots."
    : "Early days - this is exactly what practice is for.";
  const passSentence = officialPassLine
    ? `Pass line is ~${meta.passLinePct}%.`
    : `Study target is ${meta.passLinePct}%.`;
  const subcopy = meta.certId === "aip-c01"
    ? `${passSentence} ${passed ? "Review uncertain answers and check unfamiliar scenarios with official practice resources." : "Drill your weakest domain below, then run it again."} This practice percentage does not convert to AWS's 750/1000 scaled passing score.`
    : passed
    ? `${passSentence} Two clean runs above this and you are ready to book.`
    : `${passSentence} Drill your weakest domain below, then run it again.`;

  const wrongCount = questions.filter((q) => !attempt.results[q.id]?.correct).length;
  const rightCount = questions.length - wrongCount;

  return (
    <div className="results">
      <h2 className="sr-only">Results</h2>

      {/* Compact hero: ring + verdict. The 6,800px-tall per-question review now lives, collapsed,
          at the bottom (Review answers) - the redesign's core simplification. */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: "28px", flexWrap: "wrap",
          border: "1px solid var(--line)", background: "var(--panel)",
          borderRadius: "var(--radius-lg)", padding: "28px 30px", marginBottom: "20px",
        }}
      >
        <ScoreRing pct={g.pct} size={150} stroke={10} correct={g.score} total={g.total} passLine={meta.passLinePct} />
        <div style={{ flex: 1, minWidth: "220px" }}>
          <span className="eyebrow">Readiness</span>
          <h3 className="r-verdict">{headline}</h3>
          <p className="r-sub">{subcopy}</p>
          {attempt.pauseCount >= 1 && (
            <div className="pausestamp">
              Paused {attempt.pauseCount}x
              {attempt.pauseCount >= HEAVY_PAUSE_THRESHOLD && " - timing may not reflect exam conditions"}
            </div>
          )}
        </div>
      </div>

      <div className="panel" style={{ marginBottom: "22px" }}>
        <DomainBars title="Performance by domain" rows={domainRows} />
      </div>

      {weakestTwo.length > 0 && (
        <>
          <div className="eyebrow" style={{ margin: "0 0 12px" }}>
            Drill {weakestTwo.length === 1 ? "this domain" : "these two"} next
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "22px" }}>
            {weakestTwo.map((d) => (
              <a
                key={d.name}
                href={drillHref(d.name)}
                style={{
                  flex: 1, minWidth: "220px", display: "flex", alignItems: "center",
                  justifyContent: "space-between", gap: "12px", background: "var(--ink-2)",
                  border: "1px solid var(--line-strong)", borderRadius: "var(--radius-sm)",
                  padding: "16px 18px", textDecoration: "none", color: "var(--text)",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "14.5px", fontWeight: 600 }}>{d.name}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", marginTop: "3px", color: d.color }}>
                    {VERDICT_LABELS[d.verdict]}
                  </div>
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--gold)", whiteSpace: "nowrap" }}>
                  Drill {ARROW}
                </span>
              </a>
            ))}
          </div>
        </>
      )}

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "26px" }}>
        <a className="btn btn-ghost" href={`${practicePath(meta)}?mode=retry`}>Retry missed questions</a>
        <a className="btn btn-ghost" href={certPath(meta)}>Back to certification</a>
      </div>

      {/* Review answers: collapsed by default (the whole screen stays short). Opening it surfaces the
          misses expanded (open={!ok}) so a wrong answer is never buried once a learner opts in. */}
      <details className="recap-collapse">
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
            {rightCount} correct {MIDDOT} {wrongCount} to review
          </span>
          <span style={{ flex: 1 }} />
          <span className="recap-chevron" aria-hidden="true">{CHEVRON}</span>
        </summary>

        <div className="recap">
          {questions.map((q, i) => {
            const r = attempt.results[q.id];
            const ok = r?.correct ?? false;
            const chosen = r?.chosen ?? [];
            // Replay the exact per-attempt shuffle the engine showed (same seed: attemptId + q.id), so
            // the recap - and the "Your answer / Correct" letters - match the order the user saw.
            const perm = optionPermutation(attempt.attemptId, q.id, q.options.length);
            // Once the section is open, a miss opens with it (correct answers stay collapsed) so it is
            // never buried behind a second click.
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
