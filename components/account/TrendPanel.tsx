"use client";
import type { Attempt, CertMeta } from "@/lib/types";
import { getBank } from "@/lib/bank";
import { gradeAttempt } from "@/lib/scoring";
import { questionsByIds } from "@/lib/sampler";
import { readinessRead, type Verdict } from "@/lib/readiness";

// Mirror of VERDICT_COLORS in components/engine/Results.tsx. Banding is owned by
// domainVerdict (contract C10 - never inline a threshold); the colour map is duplicated
// here only so this panel does not import Results.tsx and drag engine.css along with it.
const VERDICT_COLORS: Record<Verdict, string> = {
  above: "var(--emerald)",
  borderline: "var(--gold)",
  weak: "var(--rose)",
};

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
 * Readiness trend over the user's full mocks. Below two finished mocks a trend has no shape,
 * so it renders a one-line hint instead. With two or more it shows the recent score sequence
 * plus per-domain verdicts in the SAME language as Results (above / borderline / weak, same
 * colours). The de-emphasis note fires when ANY mock in the window was heavily paused - which
 * is exactly what readinessRead acts on when it skips such mocks for the domain source.
 */
export function TrendPanel({ attempts, meta }: { attempts: Attempt[]; meta: CertMeta }) {
  const finishedMocks = attempts.filter((a) => a.mode === "mock" && a.finishedAt !== null);

  if (finishedMocks.length < 2) {
    return (
      <p className="muted" style={{ fontSize: 13.5 }}>
        Take two full mocks to unlock your readiness trend.
      </p>
    );
  }

  const bank = getBank(meta.certId);
  const graded = finishedMocks.map((attempt) => {
    const g = gradeAttempt(attempt, questionsByIds(bank, attempt.questionIds));
    return { attempt, pct: g.pct, byDomain: g.byDomain };
  });
  const readiness = readinessRead(graded, meta.passLinePct);
  const paused = readiness.trend.some((t) => t.heavilyPaused);
  const domainRows = meta.domains.filter((d) => readiness.domains[d.name]);

  return (
    <div className="card">
      <h3 style={H3}>Readiness trend</h3>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 18 }}>
        {readiness.trend.map((t, i) => {
          const latest = i === readiness.trend.length - 1;
          return (
            <span
              key={t.attemptId}
              title={t.heavilyPaused ? "Heavily paused" : undefined}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                fontWeight: latest ? 700 : 500,
                color: t.heavilyPaused ? "var(--faint)" : latest ? "var(--text)" : "var(--muted)",
              }}
            >
              {t.pct}%{t.heavilyPaused && <span aria-hidden="true"> *</span>}
            </span>
          );
        })}
      </div>

      <div>
        {domainRows.map((d) => {
          const { pct, verdict } = readiness.domains[d.name];
          return (
            <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
              <span style={{ fontSize: 13, flex: 1, minWidth: 0 }}>{d.name}</span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10.5,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: VERDICT_COLORS[verdict],
                }}
              >
                {verdict}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--muted)", width: 42, textAlign: "right" }}>
                {pct}%
              </span>
            </div>
          );
        })}
      </div>

      {paused && (
        <p className="muted" style={{ fontSize: 12.5, margin: "14px 0 0" }}>
          Heavily paused mocks are de-emphasized in these verdicts.
        </p>
      )}
    </div>
  );
}
