"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { domainReadiness, progressView } from "@/lib/progress-view";
import type { Verdict } from "@/lib/readiness";
import { getInProgress } from "@/lib/storage";
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

/**
 * Hero CTA cluster. Absorbs ResumeBanner's trigger logic (getInProgress) INTO the hero:
 * the primary flips to "Resume practicing" (linking to the exact resume URL) when a LOCAL
 * unfinished attempt exists, with a slim resume-info line carrying the answered count that
 * the design's CTA lacked. SSR / no-attempt renders "Start practicing" (the narrative
 * default), so the server shell and first client render match - progress reads happen only
 * in the effect. The primary and the "Quick 10-Q drill" ghost both target a quick session;
 * that mirrors the design's own primary+ghost-share-a-mode emphasis pattern (its
 * cta-practice and cta-drill both point at mode=drill). When resuming, the two diverge.
 */
export function HeroCtas({ certId, mockMinutes }: { certId: string; mockMinutes: number }) {
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  useEffect(() => {
    setAttempt(getInProgress(certId));
  }, [certId]);

  const base = `/aws/${certId}/practice`;
  let primaryHref = `${base}?mode=quick`;
  let primaryLabel = "Start practicing";
  let resumeLine: string | null = null;
  if (attempt) {
    const params = new URLSearchParams({ mode: attempt.mode, resume: attempt.attemptId });
    if (attempt.domain) params.set("domain", attempt.domain); // drill carries its domain
    primaryHref = `${base}?${params.toString()}`;
    primaryLabel = "Resume practicing";
    const answered = Object.keys(attempt.results).length;
    const total = attempt.questionIds.length;
    const label = MODE_LABEL[attempt.mode] ?? attempt.mode;
    resumeLine = `${label} in progress ${DOT} ${answered} of ${total} answered`;
  }

  return (
    <>
      <div className="cd-cta">
        <Button variant="primary" href={primaryHref}>
          {primaryLabel} {ARROW}
        </Button>
        <Button variant="ghost" href={`${base}?mode=mock`}>
          Take full mock {DOT} {mockMinutes} min
        </Button>
        <Button variant="ghost" href={`${base}?mode=quick`}>
          Quick 10-Q drill
        </Button>
      </div>
      {resumeLine && <p className="cd-resume-line">{resumeLine}</p>}
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
  passLinePct,
  domains,
}: {
  certId: string;
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
        const href = `/aws/${certId}/practice?mode=drill&domain=${encodeURIComponent(d.name)}`;
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
 * Readiness panel. ScoreRing (104/8) fed by bestMockPct - the SAME number the catalog card
 * shows. The label reconciles the design's hardcoded 72 to OUR passLine ("Ready to book" at
 * >= passLinePct). The note names the weakest domain from the C10 read. SSR / no-data shows
 * 0% + "Not started yet".
 */
export function ReadinessPanel({ certId, passLinePct }: { certId: string; passLinePct: number }) {
  const [pct, setPct] = useState(0);
  const [weakest, setWeakest] = useState<string | null>(null);
  useEffect(() => {
    setPct(progressView(certId, passLinePct).bestMockPct);
    const doms = Object.entries(domainReadiness(certId, passLinePct).domains);
    if (doms.length) {
      const min = doms.reduce((a, b) => (b[1].pct < a[1].pct ? b : a));
      setWeakest(min[0]);
    } else {
      setWeakest(null);
    }
  }, [certId, passLinePct]);

  const label = pct === 0 ? "Not started yet" : pct >= passLinePct ? "Ready to book" : "Getting there";
  const note =
    pct === 0
      ? "Do a quick drill to get your first read."
      : weakest
        ? `Pass line ${passLinePct}%. Weakest: ${weakest}.`
        : `Pass line ${passLinePct}%.`;

  return (
    <div className="cd-panel">
      <h3 className="cd-panel-h">Your readiness</h3>
      <div className="cd-ready">
        <div className="cd-ready-ring">
          <ScoreRing pct={pct} size={104} stroke={8} passLine={passLinePct} />
        </div>
        <div>
          <div className="cd-ready-label">{label}</div>
          <div className="cd-ready-note">{note}</div>
        </div>
      </div>
    </div>
  );
}
