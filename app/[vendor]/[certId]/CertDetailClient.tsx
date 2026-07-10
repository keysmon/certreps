"use client";
import { useEffect, useState } from "react";
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

/**
 * Hero CTA cluster. Absorbs ResumeBanner's trigger logic (getInProgress) INTO the hero:
 * the primary flips to "Resume practicing" (linking to the exact resume URL) when a LOCAL
 * unfinished attempt exists, with a slim resume-info line carrying the answered count that
 * the design's CTA lacked. SSR / no-attempt renders "Start practicing" (the narrative
 * default), so the server shell and first client render match - progress reads happen only
 * in the effect. The primary and the "Quick 10-Q drill" ghost both target a quick session;
 * that mirrors the design's own primary+ghost-share-a-mode emphasis pattern (its
 * cta-practice and cta-drill both point at mode=drill). When resuming, the two diverge. When MORE
 * than one attempt is unfinished, the newest keeps the primary CTA and the rest surface as small
 * resume links below it (listInProgress), so no in-progress session is hidden.
 */
function resumeUrl(base: string, a: Attempt): string {
  const params = new URLSearchParams({ mode: a.mode, resume: a.attemptId });
  if (a.domain) params.set("domain", a.domain); // drill carries its domain
  return `${base}?${params.toString()}`;
}

export function HeroCtas({ certId, vendorSlug, mockMinutes }: { certId: string; vendorSlug: string; mockMinutes: number }) {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  useEffect(() => {
    setAttempts(listInProgress(certId)); // newest first
  }, [certId]);

  const base = practicePath({ vendorSlug, certId });
  const attempt = attempts[0] ?? null; // the newest keeps the primary CTA
  const extras = attempts.slice(1); // older unfinished sessions -> small resume links
  let primaryHref = `${base}?mode=quick`;
  let primaryLabel = "Start practicing";
  let resumeLine: string | null = null;
  if (attempt) {
    primaryHref = resumeUrl(base, attempt);
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
      {extras.length > 0 && (
        <ul className="cd-resume-more">
          {extras.map((ex) => {
            const answered = Object.keys(ex.results).length;
            const total = ex.questionIds.length;
            const label = MODE_LABEL[ex.mode] ?? ex.mode;
            return (
              <li key={ex.attemptId}>
                <Link href={resumeUrl(base, ex)}>
                  Resume {label} {DOT} {answered} of {total} answered{ex.domain ? ` ${DOT} ${ex.domain}` : ""}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
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
 * Readiness panel. ScoreRing (104/8) fed by bestMockPct - the SAME number the catalog card
 * shows. The label reconciles the design's hardcoded 72 to OUR passLine ("Ready to book" at
 * >= passLinePct). The note names the weakest domain from the C10 read. SSR / no-data shows
 * 0% + "Not started yet".
 */
export function ReadinessPanel({
  certId,
  passLinePct,
  passLineOfficial,
}: {
  certId: string;
  passLinePct: number;
  passLineOfficial?: boolean;
}) {
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
  // Vendors that publish no official passing score: passLinePct is OUR study target, so the note
  // says "Study target" instead of asserting an official "Pass line" (absent/true stays "Pass line").
  const passLabel = passLineOfficial === false ? "Study target" : "Pass line";
  const note =
    pct === 0
      ? "Do a quick drill to get your first read."
      : weakest
        ? `${passLabel} ${passLinePct}%. Weakest: ${weakest}.`
        : `${passLabel} ${passLinePct}%.`;

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
