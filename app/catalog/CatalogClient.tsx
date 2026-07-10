"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { CertCard } from "@/components/ui/CertCard";
import { VENDORS } from "@/components/ui/VendorDot";
import { certPath } from "@/lib/routes";
import { progressView, type CertStatus } from "@/lib/progress-view";
import "./catalog.css";

// ASCII-source convention (see app/page.tsx / Results.tsx): typographic glyphs from the
// design copy are reproduced faithfully but written as escapes, never literals.
const SEARCH = String.fromCharCode(8981); // U+2315 search glyph
const CROSS = String.fromCharCode(10005); // U+2715 multiplication x
const GEAR = String.fromCharCode(9881); // U+2699 gear
const DOT = String.fromCharCode(183); // U+00B7 middle dot
const ENDASH = String.fromCharCode(8211); // U+2013 en dash (the "A-Z" range dash, final copy)

/** The registry data the server shell computes and hands to the client. Static per
 *  navigation - progress and status are layered on client-side from localStorage. */
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

type Dim = "vendor" | "level" | "status";
type Status = CertStatus;
type SortKey = "pop" | "az" | "new";

const STATUS_VALUES: Status[] = ["Not started", "In progress", "Ready"];
// Final copy (plan Task 4). Popular/Newest are registry-order approximations until we
// carry popularity/recency data - see the sort comparator below.
const SORTS: { key: SortKey; label: string }[] = [
  { key: "pop", label: "Popular" },
  { key: "az", label: `A${ENDASH}Z` },
  { key: "new", label: "Newest" },
];

// Keyed by vendorSlug (the facet identity + VENDORS key); the human display name comes from
// the map, falling back to the slug for a vendor not yet registered in VENDORS.
function vendorName(slug: string): string {
  return VENDORS[slug]?.n ?? slug;
}
function vendorColor(slug: string): string {
  return VENDORS[slug]?.c ?? "var(--gold)";
}
function uniqueInOrder(values: string[]): string[] {
  return [...new Set(values)];
}

// Module-level (stable identity) so React never remounts them on a parent re-render -
// a nested component would drop focus and detach the chip/facet DOM on every keystroke.
function FacetChip({
  label,
  dot,
  pressed,
  count,
  onToggle,
}: {
  label: string;
  dot?: string;
  pressed: boolean;
  count: number;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={`ct-chip${pressed ? " ct-chip-on" : ""}`}
      aria-pressed={pressed}
      onClick={onToggle}
    >
      {dot && <span className="ct-vd" style={{ background: dot }} aria-hidden="true" />}
      {label}
      <span className="ct-cnt">{count}</span>
    </button>
  );
}

function FacetGroup({
  label,
  active,
  onClear,
  children,
}: {
  label: string;
  active: boolean;
  onClear: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="ct-facet">
      <h4 className="ct-facet-h">
        {label}
        {active && (
          <button type="button" className="ct-rc" aria-label={`Clear ${label}`} onClick={onClear}>
            clear
          </button>
        )}
      </h4>
      <div className="ct-chips">{children}</div>
    </div>
  );
}

export function CatalogClient({ certs }: { certs: CatalogCert[] }) {
  const [filters, setFilters] = useState<Record<Dim, string[]>>({ vendor: [], level: [], status: [] });
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("pop");
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Narrow-viewport flag for the drawer a11y guard below. Read from matchMedia in an effect (jsdom
  // has no matchMedia - guarded), so SSR and the first client render carry no `inert` (no mismatch).
  const [isNarrow, setIsNarrow] = useState(false);
  // Progress + status hydrate from localStorage in an effect so SSR (and the first client
  // render) show zero-progress "Not started" cards with no hydration mismatch.
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<Record<string, Status>>({});
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const prog: Record<string, number> = {};
    const stat: Record<string, Status> = {};
    // Card bar (bestMockPct) and Status come from the one shared derivation in
    // lib/progress-view so the catalog and the cert-detail page can never disagree.
    for (const c of certs) {
      const { bestMockPct, status } = progressView(c.certId, c.passLinePct);
      prog[c.certId] = bestMockPct;
      stat[c.certId] = status;
    }
    setProgress(prog);
    setStatus(stat);
  }, [certs]);

  // Track the sub-960px breakpoint (where .ct-facets becomes the off-screen drawer) so the closed
  // drawer can be marked inert without disabling the desktop sidebar (same element, always visible
  // above 960px). Binds once; matchMedia is absent in jsdom, so tests keep their non-inert behavior.
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(max-width: 960px)");
    const sync = () => setIsNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // "/" jumps to search, unless focus is already in a field (matches the design shortcut).
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

  const statusOf = (certId: string): Status => status[certId] ?? "Not started";

  const vendorValues = useMemo(() => uniqueInOrder(certs.map((c) => c.vendorSlug)), [certs]);
  const levelValues = useMemo(() => uniqueInOrder(certs.map((c) => c.level)), [certs]);

  function valueOf(c: CatalogCert, dim: Dim): string {
    if (dim === "vendor") return c.vendorSlug;
    if (dim === "level") return c.level;
    return statusOf(c.certId);
  }
  // Live count over ALL certs for a value (not narrowed by other active facets - matches the
  // design). Status counts move once localStorage hydrates; vendor/level are static.
  function count(dim: Dim, val: string): number {
    return certs.filter((c) => valueOf(c, dim) === val).length;
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const base = certs.filter((c) => {
      if (filters.vendor.length && !filters.vendor.includes(c.vendorSlug)) return false;
      if (filters.level.length && !filters.level.includes(c.level)) return false;
      if (filters.status.length && !filters.status.includes(statusOf(c.certId))) return false;
      if (q) {
        const hay = `${c.title} ${vendorName(c.vendorSlug)} ${c.examCode}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    // Popular = registry order (no popularity data); Newest = registry order reversed
    // (recency approximation); A-Z = by title. Approximations noted in the plan.
    if (sort === "az") return [...base].sort((a, b) => a.title.localeCompare(b.title));
    if (sort === "new") return [...base].reverse();
    return base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [certs, filters, query, sort, status]);

  function toggle(dim: Dim, val: string) {
    setFilters((f) => {
      const has = f[dim].includes(val);
      return { ...f, [dim]: has ? f[dim].filter((v) => v !== val) : [...f[dim], val] };
    });
  }
  function clearGroup(dim: Dim) {
    setFilters((f) => ({ ...f, [dim]: [] }));
  }
  function clearAll() {
    setFilters({ vendor: [], level: [], status: [] });
    setQuery("");
  }

  // Single-selected facets name the view (design order minus the omitted role group).
  const parts: string[] = [];
  if (filters.vendor.length === 1) parts.push(vendorName(filters.vendor[0]));
  if (filters.level.length === 1) parts.push(filters.level[0]);
  const heading = parts.length ? parts.join(` ${DOT} `) : "All certifications";

  const tags: { dim: Dim; val: string; label: string; dot?: string }[] = [
    ...filters.vendor.map((v) => ({ dim: "vendor" as Dim, val: v, label: vendorName(v), dot: vendorColor(v) })),
    ...filters.level.map((v) => ({ dim: "level" as Dim, val: v, label: v })),
    ...filters.status.map((v) => ({ dim: "status" as Dim, val: v, label: v })),
  ];

  return (
    <div className="ct-wrap">
      {/* Closed mobile drawer sits off-screen but stays in the tab order - mark it inert then (narrow
          AND closed). Never inert on desktop, where this same element is the live sticky sidebar. */}
      <aside className={`ct-facets${drawerOpen ? " ct-facets-open" : ""}`} aria-label="Filters" inert={isNarrow && !drawerOpen}>
        <button type="button" className="ct-facet-close" onClick={() => setDrawerOpen(false)}>
          Done <span aria-hidden="true">{CROSS}</span>
        </button>

        <div className="ct-searchbar">
          <span className="ct-faint" aria-hidden="true">{SEARCH}</span>
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search certs"
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

        <FacetGroup label="Vendor" active={filters.vendor.length > 0} onClear={() => clearGroup("vendor")}>
          {vendorValues.map((v) => (
            <FacetChip
              key={v}
              label={vendorName(v)}
              dot={vendorColor(v)}
              pressed={filters.vendor.includes(v)}
              count={count("vendor", v)}
              onToggle={() => toggle("vendor", v)}
            />
          ))}
        </FacetGroup>
        <FacetGroup label="Level" active={filters.level.length > 0} onClear={() => clearGroup("level")}>
          {levelValues.map((v) => (
            <FacetChip
              key={v}
              label={v}
              pressed={filters.level.includes(v)}
              count={count("level", v)}
              onToggle={() => toggle("level", v)}
            />
          ))}
        </FacetGroup>
        <FacetGroup label="Status" active={filters.status.length > 0} onClear={() => clearGroup("status")}>
          {STATUS_VALUES.map((v) => (
            <FacetChip
              key={v}
              label={v}
              pressed={filters.status.includes(v)}
              count={count("status", v)}
              onToggle={() => toggle("status", v)}
            />
          ))}
        </FacetGroup>
      </aside>

      <main className="ct-main" id="maincontent">
        <div className="ct-mhead">
          <div>
            <span className="ct-eyebrow">
              {filtered.length} of {certs.length} certifications
            </span>
            <h1 className="ct-title">{heading}</h1>
          </div>
          <button type="button" className="btn btn-ghost ct-filter-btn" onClick={() => setDrawerOpen(true)}>
            <span aria-hidden="true">{GEAR}</span> Filters
          </button>
          <div className="ct-seg" role="group" aria-label="Sort certifications">
            {SORTS.map((s) => (
              <button
                key={s.key}
                type="button"
                className={sort === s.key ? "ct-seg-on" : undefined}
                aria-pressed={sort === s.key}
                onClick={() => setSort(s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {tags.length > 0 && (
          <div className="ct-activebar">
            {tags.map((t) => (
              <button
                key={`${t.dim}:${t.val}`}
                type="button"
                className="ct-tag"
                aria-label={`Remove ${t.label}`}
                onClick={() => toggle(t.dim, t.val)}
              >
                {t.dot && <span className="ct-vd" style={{ background: t.dot }} aria-hidden="true" />}
                {t.label} <span className="ct-tag-x" aria-hidden="true">{CROSS}</span>
              </button>
            ))}
            <button type="button" className="ct-clearall" onClick={clearAll}>
              Clear all
            </button>
          </div>
        )}

        {filtered.length > 0 ? (
          <div className="ct-grid">
            {filtered.map((c, i) => (
              <div key={c.certId} className="ds-rise" style={{ animationDelay: `${Math.min(i * 28, 320)}ms` }}>
                <CertCard
                  meta={{ certId: c.certId, vendor: c.vendor, vendorSlug: c.vendorSlug, examCode: c.examCode, title: c.title, level: c.level }}
                  href={certPath(c)}
                  questions={c.questions}
                  progress={progress[c.certId] ?? 0}
                  style={{ height: "100%" }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="ct-empty">
            <div className="ct-empty-glyph" aria-hidden="true">{SEARCH}</div>
            <div className="ct-empty-big">No certs match those filters</div>
            <div>Try removing a filter or searching a different term.</div>
            <button type="button" className="btn btn-ghost ct-empty-btn" onClick={clearAll}>
              Clear all filters
            </button>
          </div>
        )}
      </main>

      <div
        className={`ct-backdrop${drawerOpen ? " ct-backdrop-open" : ""}`}
        aria-hidden="true"
        onClick={() => setDrawerOpen(false)}
      />
    </div>
  );
}
