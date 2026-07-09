export interface DomainBarRow {
  name: string;
  /** Explicit readiness percent. If omitted, derived from correct/total. */
  pct?: number;
  correct?: number;
  total?: number;
  /** Caller-supplied verdict + bar color. Per contract C10 the caller owns banding
   *  (it computes verdicts through lib/readiness.domainVerdict), so when these are
   *  present they are the source of truth and always win over the fallbacks below. */
  verdict?: string;
  color?: string;
}

export interface DomainBarsProps {
  rows?: DomainBarRow[];
  title?: string;
}

// FALLBACKS ONLY. C10 says domain banding lives in lib/readiness (domainVerdict);
// every real caller passes an explicit `verdict` + `color`, so these run only for a
// caller that supplied neither (e.g. a raw pct with no verdict). Kept 80/65/50 across
// both so the colorless fallback path stays internally consistent - do NOT treat
// these thresholds as product truth.
function colorFor(pct: number) {
  return pct >= 80 ? "var(--emerald)" : pct >= 65 ? "var(--gold)" : "var(--rose)";
}
function verdictFor(pct: number) {
  return pct >= 80 ? "Above" : pct >= 65 ? "Fair" : pct >= 50 ? "Borderline" : "Weak";
}

export function DomainBars({ rows = [], title = "Performance by domain" }: DomainBarsProps) {
  return (
    <div>
      {title && (
        <h4 style={{ fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: ".14em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 500, margin: "0 0 12px" }}>{title}</h4>
      )}
      {rows.map((row, i) => {
        const pct = row.pct != null ? row.pct : Math.round(((row.correct ?? 0) / (row.total || 1)) * 100);
        const col = row.color || colorFor(pct);
        const verdict = row.verdict || verdictFor(pct);
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 0" }}>
            <span style={{ fontSize: "13.5px", width: "46%" }}>{row.name}</span>
            <div style={{ flex: 1, height: "7px", background: "var(--panel-3)", borderRadius: "4px", overflow: "hidden" }}>
              <span style={{ display: "block", height: "100%", width: pct + "%", background: col, borderRadius: "4px" }} />
            </div>
            {row.correct != null && row.total != null && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--muted)", width: "44px", textAlign: "right" }}>{row.correct}/{row.total}</span>
            )}
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: ".06em", width: "84px", textAlign: "right", color: col }}>{verdict}</span>
          </div>
        );
      })}
    </div>
  );
}
