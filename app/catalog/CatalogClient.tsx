"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { CertCard } from "@/components/ui/CertCard";
import { VENDORS } from "@/components/ui/VendorDot";
import { certPath } from "@/lib/routes";
import { useAttemptRevision } from "@/lib/useAttemptRevision";
import { progressView } from "@/lib/progress-view";
import "./catalog.css";

// ASCII-source convention (see app/page.tsx / Results.tsx): typographic glyphs from the
// design copy are reproduced faithfully but written as escapes, never literals.
const SEARCH = String.fromCharCode(8981); // U+2315 search glyph
const CROSS = String.fromCharCode(10005); // U+2715 multiplication x
const DOT = String.fromCharCode(183); // U+00B7 middle dot

/** The registry data the server shell computes and hands to the client. Static per
 *  navigation - progress hydrates client-side from localStorage. */
export interface CatalogCert {
  certId: string;
  vendor: string;
  vendorSlug: string;
  title: string;
  examCode: string;
  level: string;
  questions: number;
  passLinePct: number;
}

function vendorName(slug: string): string {
  return VENDORS[slug]?.n ?? slug;
}

// Level display order for the segmented filter; any level not listed sorts after these.
const LEVEL_ORDER = ["Foundational", "Associate", "Professional", "Specialty"];

/**
 * Catalog, redesigned "for simplicity": the Vendor/Status filter sidebar (+ its mobile drawer,
 * sort control, and active-filter bar) is gone. What remains is a welcoming headline, a single
 * search field, one level segmented filter, and the same auto-fill card grid. Search matches
 * title / vendor / code; the "/" shortcut focuses it. Progress still hydrates client-side so a
 * card with a finished mock flips to Resume.
 */
export function CatalogClient({ certs }: { certs: CatalogCert[] }) {
  const revision = useAttemptRevision();
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("All");
  const [progress, setProgress] = useState<Record<string, number>>({});
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const prog: Record<string, number> = {};
    // bestMockPct is the one shared derivation (lib/progress-view) so catalog + cert-detail agree.
    for (const c of certs) prog[c.certId] = progressView(c.certId, c.passLinePct).bestMockPct;
    setProgress(prog);
  }, [certs, revision]);

  // "/" jumps to search, unless focus is already in a field.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/") return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      e.preventDefault();
      searchRef.current?.focus();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const levels = useMemo(() => {
    const present = new Set(certs.map((c) => c.level));
    const ordered = LEVEL_ORDER.filter((l) => present.has(l));
    const extra = [...present].filter((l) => !LEVEL_ORDER.includes(l));
    return ["All", ...ordered, ...extra];
  }, [certs, revision]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return certs.filter((c) => {
      if (level !== "All" && c.level !== level) return false;
      if (q) {
        const hay = `${c.title} ${vendorName(c.vendorSlug)} ${c.examCode}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [certs, query, level]);

  function reset() {
    setQuery("");
    setLevel("All");
  }

  return (
    <main className="ct-wrap-v2" id="maincontent">
      <div className="ct-intro">
        <span className="ct-eyebrow2">Free forever {DOT} no signup to practice</span>
        <h1 className="ct-h1-v2">What are you certifying in?</h1>
        <p className="ct-sub">
          Pick an exam and take your first ten questions right now. Everything else - mocks,
          readiness, your weak spots - reveals itself as you go.
        </p>
      </div>

      <div className="ct-search-v2">
        <span className="ct-faint" aria-hidden="true">{SEARCH}</span>
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search exams by name or code..."
          aria-label="Search certifications"
        />
        {query && (
          <button
            type="button"
            className="ct-clr"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              searchRef.current?.focus();
            }}
          >
            {CROSS}
          </button>
        )}
      </div>

      <div className="ct-levelrow">
        <div className="ct-seg2" role="group" aria-label="Filter by level">
          {levels.map((l) => (
            <button
              key={l}
              type="button"
              className={level === l ? "ct-seg2-on" : undefined}
              aria-pressed={level === l}
              onClick={() => setLevel(l)}
            >
              {l}
            </button>
          ))}
        </div>
        <span className="ct-count">
          {filtered.length} of {certs.length} exams
        </span>
      </div>

      {filtered.length > 0 ? (
        <div className="ct-grid">
          {filtered.map((c, i) => (
            <div key={c.certId} className="ds-rise" style={{ animationDelay: `${Math.min(i * 28, 320)}ms` }}>
              <CertCard
                meta={{ certId: c.certId, vendor: c.vendor, vendorSlug: c.vendorSlug, examCode: c.examCode, title: c.title, level: c.level }}
                href={certPath(c)}
                progress={progress[c.certId] ?? 0}
                style={{ height: "100%" }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="ct-empty">
          <div className="ct-empty-glyph" aria-hidden="true">{SEARCH}</div>
          <div className="ct-empty-big">No exams match your search</div>
          <div>Try a different term or clear the level filter.</div>
          <button type="button" className="btn btn-ghost ct-empty-btn" onClick={reset}>
            Clear filters
          </button>
        </div>
      )}
    </main>
  );
}
