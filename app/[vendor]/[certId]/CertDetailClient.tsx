"use client";
import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { domainReadiness, progressView } from "@/lib/progress-view";
import { practicePath } from "@/lib/routes";
import type { Verdict } from "@/lib/readiness";
import { listInProgress } from "@/lib/storage";
import type { Attempt } from "@/lib/types";

// ASCII-source convention (see app/page.tsx / CatalogClient.tsx): typographic glyphs from
// the design copy are reproduced faithfully but written as escapes, never literals.
const ARROW = String.fromCharCode(8594); // U+2192 rightwards arrow
const DOT = String.fromCharCode(183); // U+00B7 middle dot

const MODE_LABEL: Record<string, string> = {
  quick: "Quick Practice",
  drill: "Domain Drill",
  mock: "Full Mock",
  retry: "Retry Missed",
};

// Verdict -> display word + accent. C10 owns the three-band verdict (lib/readiness); this
// only maps it to the design's word/color. "Not started" is the no-data (SSR) default.
const VERDICT_WORD: Record<Verdict, string> = { above: "Above", borderline: "Borderline", weak: "Weak" };
const VERDICT_COLOR: Record<Verdict, string> = {
  above: "var(--emerald)",
  borderline: "var(--gold)",
  weak: "var(--rose)",
};

export interface HeroDomain {
  name: string;
  weightPct: number;
}

// Resume URL for an unfinished attempt (mode + resume id; drill carries its domain).
function resumeUrl(base: string, a: Attempt): string {
  const params = new URLSearchParams({ mode: a.mode, resume: a.attemptId });
  if (a.domain) params.set("domain", a.domain);
  return `${base}?${params.toString()}`;
}

// A question is answered only when a choice was recorded. A flagged-but-unanswered mock question
// carries a legitimate empty-chosen result row (v1h), which must NOT inflate the "n of m answered"
// resume line - count recorded choices (chosen.length > 0), not bare result rows.
const answeredCount = (a: Attempt): number =>
  Object.values(a.results).filter((r) => r.chosen.length > 0).length;

const stepCard = (primary: boolean): CSSProperties => ({
  display: "flex", gap: "18px", borderRadius: "16px", padding: "22px 24px", marginBottom: "14px",
  border: primary ? "1px solid var(--gold-dim)" : "1px solid var(--line)",
  background: primary
    ? "linear-gradient(180deg,var(--gold-soft),transparent 70%),var(--panel)"
    : "var(--panel)",
});
const stepNum = (primary: boolean): CSSProperties => ({
  flexShrink: 0, width: "34px", height: "34px", borderRadius: "10px", display: "grid", placeItems: "center",
  fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "16px",
  background: primary ? "var(--gold)" : "var(--panel-3)", color: primary ? "var(--on-gold)" : "var(--muted)",
});
const stepTitle: CSSProperties = { fontFamily: "var(--font-display)", fontSize: "19px", fontWeight: 700, margin: 0 };
const stepBody: CSSProperties = { fontSize: "14px", color: "var(--muted)", margin: "5px 0 16px", lineHeight: 1.55 };

/**
 * "Your path to ready" - the three-step cert-detail flow that replaces the old hero-CTA cluster +
 * always-open domain list + 3-column explainer + sidebar. Step 1 owns the one primary action
 * (resume-aware, mirroring the old HeroCtas), with the per-domain drills tucked behind a toggle
 * (progressive disclosure). Steps 2 + 3 carry the mock and the readiness read.
 */
export function PathToReady({
  certId,
  vendorSlug,
  mockMinutes,
  mockQuestionCount,
  passLinePct,
  passLineOfficial,
  domains,
}: {
  certId: string;
  vendorSlug: string;
  mockMinutes: number;
  mockQuestionCount: number;
  passLinePct: number;
  passLineOfficial?: boolean;
  domains: HeroDomain[];
}) {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [domainsOpen, setDomainsOpen] = useState(false);
  useEffect(() => {
    setAttempts(listInProgress(certId)); // newest first
  }, [certId]);

  const base = practicePath({ vendorSlug, certId });
  const attempt = attempts[0] ?? null; // newest keeps the primary CTA
  const extras = attempts.slice(1); // older unfinished sessions -> small resume links
  const primaryHref = attempt ? resumeUrl(base, attempt) : `${base}?mode=quick`;
  const primaryLabel = attempt ? "Resume practicing" : "Start practicing";
  const resumeLine = attempt
    ? `${MODE_LABEL[attempt.mode] ?? attempt.mode} in progress ${DOT} ${answeredCount(attempt)} of ${attempt.questionIds.length} answered`
    : null;

  return (
    <>
      {/* Step 1 - the one primary action */}
      <div style={stepCard(true)}>
        <div style={stepNum(true)}>1</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={stepTitle}>Practice a domain</h3>
          <p style={stepBody}>Answer original scenario questions one at a time. Miss one and see exactly why - immediately, with a link to the source docs.</p>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
            <Button variant="primary" href={primaryHref}>{primaryLabel} {ARROW}</Button>
            <button
              type="button"
              onClick={() => setDomainsOpen((o) => !o)}
              aria-expanded={domainsOpen}
              style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: "12.5px", color: "var(--gold)" }}
            >
              {domainsOpen ? "Hide domains ▴" : "Or pick a specific domain ▾"}
            </button>
          </div>
          {resumeLine && <p className="cd-resume-line">{resumeLine}</p>}
          {extras.length > 0 && (
            <ul className="cd-resume-more">
              {extras.map((ex) => (
                <li key={ex.attemptId}>
                  <Link href={resumeUrl(base, ex)}>
                    Resume {MODE_LABEL[ex.mode] ?? ex.mode} {DOT} {answeredCount(ex)} of {ex.questionIds.length} answered{ex.domain ? ` ${DOT} ${ex.domain}` : ""}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {domainsOpen && (
            <div style={{ marginTop: "16px" }}>
              <DomainRows certId={certId} vendorSlug={vendorSlug} passLinePct={passLinePct} domains={domains} />
            </div>
          )}
        </div>
      </div>

      {/* Step 2 - the full mock */}
      <div style={stepCard(false)}>
        <div style={stepNum(false)}>2</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={stepTitle}>Sit the full mock</h3>
          <p style={stepBody}>Real exam timing and question count - no peeking, just like the day itself. Do this once the domains feel steady.</p>
          <Button variant="ghost" href={`${base}?mode=mock`}>Take the full mock {DOT} {mockQuestionCount} Q {DOT} {mockMinutes} min</Button>
        </div>
      </div>

      {/* Step 3 - readiness */}
      <div style={stepCard(false)}>
        <div style={stepNum(false)}>3</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={stepTitle}>Know when you&apos;re ready</h3>
          <p style={stepBody}>A readiness report scores every domain against your target and names what to drill before you book.</p>
          <div style={{ display: "flex", alignItems: "center", gap: "18px", flexWrap: "wrap" }}>
            <ReadinessPanel certId={certId} passLinePct={passLinePct} passLineOfficial={passLineOfficial} bare />
            <Link href="/account" style={{ fontFamily: "var(--font-mono)", fontSize: "12.5px", color: "var(--gold)" }}>
              View your progress {ARROW}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Domain rows. Each row is a single Link (keyboard/focus native, no nested button) to the
 * per-domain drill. The progress track + verdict hydrate from finished mocks via OUR C10
 * read (domainReadiness -> readinessRead, most-recent non-heavily-paused mock, not an
 * aggregate); SSR / no-data renders an empty track and a muted "Not started".
 */
export function DomainRows({
  certId,
  vendorSlug,
  passLinePct,
  domains,
}: {
  certId: string;
  vendorSlug: string;
  passLinePct: number;
  domains: HeroDomain[];
}) {
  const [reads, setReads] = useState<Record<string, { pct: number; verdict: Verdict }>>({});
  useEffect(() => {
    setReads(domainReadiness(certId, passLinePct).domains);
  }, [certId, passLinePct]);

  return (
    <div>
      {domains.map((d, i) => {
        const read = reads[d.name];
        const pct = read?.pct ?? 0;
        const color = read ? VERDICT_COLOR[read.verdict] : "var(--faint)";
        const word = read ? VERDICT_WORD[read.verdict] : "Not started";
        const href = `${practicePath({ vendorSlug, certId })}?mode=drill&domain=${encodeURIComponent(d.name)}`;
        return (
          <Link key={d.name} href={href} className="cd-domain" aria-label={`Drill ${d.name}`}>
            <span className="cd-domain-idx">{i + 1}</span>
            <div className="cd-domain-main">
              <div className="cd-domain-name">
                {d.name}
                <span className="cd-domain-weight">
                  {"  "}
                  {DOT} {d.weightPct}% of exam
                </span>
              </div>
              <div className="cd-track">
                <span style={{ width: `${pct}%`, background: color }} />
              </div>
            </div>
            <span className="cd-verd" style={{ color }}>
              {word}
            </span>
            <span className="cd-drill">Drill {ARROW}</span>
          </Link>
        );
      })}
    </div>
  );
}

/**
 * Readiness read. ScoreRing (mock-fed bestMockPct) + label + note. `bare` drops the panel
 * chrome + heading so it can nest inside the Step-3 card without a double border; the default
 * keeps the standalone "Your readiness" panel. SSR / no-data shows 0% + "Not started yet".
 */
export function ReadinessPanel({
  certId,
  passLinePct,
  passLineOfficial,
  bare = false,
}: {
  certId: string;
  passLinePct: number;
  passLineOfficial?: boolean;
  bare?: boolean;
}) {
  const [pct, setPct] = useState(0);
  const [started, setStarted] = useState(false);
  const [weakest, setWeakest] = useState<string | null>(null);
  useEffect(() => {
    const pv = progressView(certId, passLinePct);
    setPct(pv.bestMockPct);
    setStarted(pv.status !== "Not started");
    const doms = Object.entries(domainReadiness(certId, passLinePct).domains);
    if (doms.length) {
      const min = doms.reduce((a, b) => (b[1].pct < a[1].pct ? b : a));
      setWeakest(min[0]);
    } else {
      setWeakest(null);
    }
  }, [certId, passLinePct]);

  // The ring is mock-fed (bestMockPct), so pct 0 has two honest states: never touched vs
  // started-but-no-scored-mock. Only a finished full mock moves this ring (a drill never does).
  const label = pct === 0 ? (started ? "In progress" : "Not started yet") : pct >= passLinePct ? "Ready to book" : "Getting there";
  const passLabel = passLineOfficial === false ? "Study target" : "Pass line";
  const note =
    pct === 0
      ? started
        ? "Finish a full mock to get your readiness read."
        : "Take a full mock to get your first read."
      : weakest
        ? `${passLabel} ${passLinePct}%. Weakest: ${weakest}.`
        : `${passLabel} ${passLinePct}%.`;

  const body = (
    <div className="cd-ready">
      <div className="cd-ready-ring">
        <ScoreRing pct={pct} size={bare ? 76 : 104} stroke={bare ? 6 : 8} passLine={passLinePct} />
      </div>
      <div>
        <div className="cd-ready-label">{label}</div>
        <div className="cd-ready-note">{note}</div>
      </div>
    </div>
  );

  if (bare) return body;
  return (
    <div className="cd-panel">
      <h3 className="cd-panel-h">Your readiness</h3>
      {body}
    </div>
  );
}
