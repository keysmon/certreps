"use client";
import Link from "next/link";
import type { Attempt, CertMeta } from "@/lib/types";
import { getBank } from "@/lib/bank";
import { gradeAttempt } from "@/lib/scoring";
import { questionsByIds } from "@/lib/sampler";
import { practicePath } from "@/lib/routes";

const MODE_LABEL: Record<string, string> = {
  mock: "Full mock",
  quick: "Quick 10",
  drill: "Drill",
  retry: "Retry missed",
};

// Muted mono chip in the spirit of .rd (engine.css), mirrored here so this list does not
// have to pull in engine.css. A single hairline border, no fill - deliberately understated.
const chipStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--muted)",
  border: "1px solid var(--line)",
  borderRadius: 20,
  padding: "3px 10px",
  whiteSpace: "nowrap",
};

function stamp(ts: number): string {
  const d = new Date(ts);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

/**
 * The user's practice history, newest first. Finished rows carry a score (binary pass
 * colour on meta.passLinePct) and link to the read-only replay; unfinished rows show an
 * "In progress" marker and stay unlinked (there is nothing to review yet). Scores grade
 * against the live bank, so a row for a since-removed question simply drops from its total.
 */
export function AttemptsList({ attempts, meta }: { attempts: Attempt[]; meta: CertMeta }) {
  if (attempts.length === 0) {
    return (
      <div className="card" style={{ textAlign: "center" }}>
        <p className="muted" style={{ margin: "0 0 14px" }}>
          No practice history yet - take a quick 10 to get started.
        </p>
        <Link className="btn btn-primary" href={`${practicePath(meta)}?mode=quick`}>
          Quick 10
        </Link>
      </div>
    );
  }

  const bank = getBank(meta.certId);
  const rows = [...attempts].sort((a, b) => b.startedAt - a.startedAt);

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      {rows.map((a, i) => {
        const finished = a.finishedAt !== null;
        const pct = finished ? gradeAttempt(a, questionsByIds(bank, a.questionIds)).pct : null;
        const passed = pct !== null && pct >= meta.passLinePct;
        const last = i === rows.length - 1;

        const inner = (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px 20px",
              borderBottom: last ? "none" : "1px solid var(--line)",
            }}
          >
            <span style={{ fontSize: 13.5 }}>{stamp(a.startedAt)}</span>
            <span style={chipStyle}>{MODE_LABEL[a.mode] ?? a.mode}</span>
            <span
              style={{
                marginLeft: "auto",
                fontFamily: "var(--font-mono)",
                fontSize: 14,
                fontWeight: 600,
                color: finished ? (passed ? "var(--emerald)" : "var(--rose)") : "var(--muted)",
              }}
            >
              {finished ? `${pct}%` : "In progress"}
            </span>
          </div>
        );

        return finished ? (
          <Link
            key={a.attemptId}
            href={`/account/attempts/${a.attemptId}`}
            style={{ display: "block", color: "inherit", textDecoration: "none" }}
          >
            {inner}
          </Link>
        ) : (
          <div key={a.attemptId}>{inner}</div>
        );
      })}
    </div>
  );
}
