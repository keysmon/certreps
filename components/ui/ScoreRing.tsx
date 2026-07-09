export interface ScoreRingProps {
  pct?: number;
  size?: number;
  correct?: number;
  total?: number;
  label?: string;
  stroke?: number;
  /** Pass mark for the emerald band. Default 72 preserves every existing call site
   *  (detail rail, progress cards) unchanged; Results threads meta.passLinePct so the ring
   *  turns emerald at OUR pass line, not a hardcoded 72 - the pull-forward of the pinned
   *  Task-10 item. The gold/rose split stays at 50 ("half correct"), a cert-independent
   *  floor rather than a pass-line-derived band. */
  passLine?: number;
}

export function ScoreRing({ pct = 0, size = 168, correct, total, label, stroke = 9, passLine = 72 }: ScoreRingProps) {
  const r = size / 2 - stroke - 1;
  const circ = 2 * Math.PI * r;
  const col = pct >= passLine ? "var(--emerald)" : pct >= 50 ? "var(--gold)" : "var(--rose)";
  const dash = (pct / 100) * circ;
  const hasScore = correct != null && total != null;

  // The ring + the visual number are decorative: a screen reader gets one clean
  // sentence from the sr-only span instead of the fragmented visual tokens (and the
  // "of" phrasing reads better than the visual "/"). Mirrors the Results.tsx idiom
  // of an aria-hidden ring, extended to the number so nothing is announced twice.
  const srScore = `${pct}%${hasScore ? `, ${correct} of ${total} correct` : ""}${label ? `, ${label}` : ""}`;

  return (
    <div style={{ width: size + "px", height: size + "px", position: "relative", display: "grid", placeItems: "center", textAlign: "center" }}>
      <svg width={size} height={size} aria-hidden="true" style={{ transform: "rotate(-90deg)", position: "absolute", inset: 0 }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(132,170,208,.14)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${dash.toFixed(0)} ${circ.toFixed(0)}`} />
      </svg>
      <div aria-hidden="true">
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: Math.round(size * 0.27) + "px", color: pct === 0 ? "var(--faint)" : "var(--text)", fontVariantNumeric: "tabular-nums" }}>{pct}%</div>
        {hasScore && <div style={{ fontFamily: "var(--font-mono)", fontSize: "12.5px", color: "var(--muted)" }}>{correct} / {total} correct</div>}
        {label && <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--muted)" }}>{label}</div>}
      </div>
      <span className="sr-only">{srScore}</span>
    </div>
  );
}
