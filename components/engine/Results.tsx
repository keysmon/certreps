"use client";
import type { Attempt, CertMeta, Question } from "@/lib/types";
import { gradeAttempt } from "@/lib/scoring";
import { HEAVY_PAUSE_THRESHOLD, domainVerdict, type Verdict } from "@/lib/readiness";
import "./engine.css";

const CHECK = String.fromCharCode(10003);
const CROSS = String.fromCharCode(10007);

// Single source of truth for band colors (contract C10: banding lives in domainVerdict, never inline).
const VERDICT_COLORS: Record<Verdict, string> = {
  above: "var(--emerald)",
  borderline: "var(--gold)",
  weak: "var(--rose)",
};

export function Results({ attempt, questions, meta }: { attempt: Attempt; questions: Question[]; meta: CertMeta }) {
  const g = gradeAttempt(attempt, questions);
  const passed = g.pct >= meta.passLinePct;
  const circ = 2 * Math.PI * 76;
  const dash = (g.score / Math.max(1, g.total)) * circ;
  const ring = passed ? "var(--emerald)" : "var(--gold)";

  return (
    <div className="results">
      <h2 style={{ position: "absolute", left: -9999 }}>Results</h2>
      <div className="score-ring">
        <svg width="168" height="168" viewBox="0 0 168 168">
          <circle cx="84" cy="84" r="76" fill="none" stroke="var(--line)" strokeWidth="10" />
          <circle cx="84" cy="84" r="76" fill="none" stroke={ring} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} />
        </svg>
        <div>
          <div className="score-num">{g.pct}%</div>
          <div className="score-den">{g.score} / {g.total} correct</div>
        </div>
      </div>

      {attempt.pauseCount >= HEAVY_PAUSE_THRESHOLD && (
        <div className="pausestamp">Paused {attempt.pauseCount}x - timing may not reflect exam conditions</div>
      )}

      <p style={{ color: "var(--muted)", fontSize: 14 }}>
        Pass line is ~{meta.passLinePct}%. Avg {g.avgSecPerQuestion}s per question.
      </p>

      <div className="breakdown">
        <h3>Performance by domain</h3>
        {meta.domains.filter((d) => g.byDomain[d.name]).map((d) => {
          const v = g.byDomain[d.name];
          const pct = v.total ? Math.round((v.correct / v.total) * 100) : 0;
          const col = VERDICT_COLORS[domainVerdict(pct, meta.passLinePct)];
          return (
            <div className="brow" key={d.name}>
              <span className="bn">{d.name}</span>
              <span className="bbar"><span style={{ width: `${pct}%`, background: col }} /></span>
              <span className="bsc">{v.correct}/{v.total}</span>
            </div>
          );
        })}
      </div>

      <div className="recap">
        <h3>Question recap</h3>
        {questions.map((q, i) => {
          const r = attempt.results[q.id];
          const ok = r?.correct ?? false;
          return (
            <div className="recap-item" key={q.id}>
              <span className={`ri ${ok ? "ok" : "no"}`}>{ok ? CHECK : CROSS}</span>
              <span className="rq">Q{i + 1} - {q.stem.slice(0, 58)}...</span>
              <span className="rd">{q.tag}</span>
            </div>
          );
        })}
      </div>

      <a className="btn btn-primary" href={`/aws/${meta.certId}`}>Back to {meta.examCode}</a>
    </div>
  );
}
