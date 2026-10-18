"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { listCerts } from "@/lib/certs";
import { certPath } from "@/lib/routes";
import { VENDORS } from "@/components/ui/VendorDot";
import { useAttemptRevision } from "@/lib/useAttemptRevision";
import { progressView } from "@/lib/progress-view";
import { listAttempts } from "@/lib/storage";
import "./CommandSwitcher.css";

// Typographic glyphs as escapes (ASCII-source craft convention, see CatalogClient / Results).
const CMDK = String.fromCharCode(8984) + "K"; // U+2318 place-of-interest sign + K
const MIDDOT = String.fromCharCode(183); // U+00B7 middle dot
const CHEV = String.fromCharCode(9662); // U+25BE down-pointing triangle - the "Switch" chip affordance
const ARROWS = String.fromCharCode(8593) + String.fromCharCode(8595); // U+2191 U+2193 up/down
const RETURN = String.fromCharCode(8629); // U+21B5 carriage return arrow

interface SwitcherItem {
  certId: string;
  vendorSlug: string;
  title: string;
  vendorLabel: string;
  examCode: string;
  color: string;
  pct: number;
  hasProgress: boolean;
}

interface ProgressEntry {
  pct: number;
  hasProgress: boolean;
}

function vendorColor(slug: string): string {
  return VENDORS[slug]?.c ?? "var(--gold)";
}
function vendorLabel(slug: string): string {
  return VENDORS[slug]?.n ?? slug;
}

/**
 * The cert with the newest local attempt activity (max startedAt), or null when the store is empty.
 * Parity with the dashboard's "last studied" ordering (AccountClient.computeView). Reads localStorage,
 * so it runs effect-time only.
 */
function mostRecentCertId(certIds: string[]): string | null {
  let bestId: string | null = null;
  let bestTs = -1;
  for (const id of certIds) {
    const atts = listAttempts(id);
    if (!atts.length) continue;
    const ts = Math.max(...atts.map((a) => a.startedAt));
    if (ts > bestTs) {
      bestTs = ts;
      bestId = id;
    }
  }
  return bestId;
}

/**
 * Global Cmd/Ctrl+K certification switcher. Renders the TopNav cert-pill trigger plus an overlay
 * dialog (combobox + listbox) driven off OUR registry (listCerts) and lib/progress-view. Empty-query
 * order puts certs-with-progress first (registry order within groups); a query is a case-insensitive
 * substring over title + vendor + exam code.
 *
 * hasProgress = progress-view status !== "Not started" and pct = bestMockPct, so an in-progress cert
 * with no finished mock reads honestly as "0% MIDDOT resume" (there is a live attempt to resume) - the
 * same single-source-of-truth the catalog card and detail ring use.
 *
 * a11y improvements over the design prototype (which neither traps nor restores focus): focus moves
 * into the input on open and returns to the trigger on close, and a minimal Tab trap keeps focus in
 * the dialog. The Cmd+K binding lives on a component-scoped document listener, so it exists only where
 * TopNav mounts - never on the practice engine, which keeps its own keyboard.
 */
export function CommandSwitcher() {
  const router = useRouter();
  const registry = useMemo(() => listCerts(), []);

  const [open, setOpen] = useState(false);
  const revision = useAttemptRevision();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  // Progress + most-recent hydrate from localStorage in an effect so SSR and the first client render
  // agree on the zero-progress fallback (no hydration mismatch) - the CatalogClient idiom.
  const [progressByCert, setProgressByCert] = useState<Record<string, ProgressEntry>>({});
  const [recentId, setRecentId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(false);
  const wasOpen = useRef(false);

  useEffect(() => {
    const map: Record<string, ProgressEntry> = {};
    for (const m of registry) {
      const pv = progressView(m.certId, m.passLinePct);
      map[m.certId] = { pct: pv.bestMockPct, hasProgress: pv.status !== "Not started" };
    }
    setProgressByCert(map);
    setRecentId(mostRecentCertId(registry.map((m) => m.certId)));
  }, [registry, revision]);

  const openSwitcher = useCallback(() => {
    setQuery("");
    setActive(0);
    setOpen(true);
  }, []);
  const closeSwitcher = useCallback(() => setOpen(false), []);

  // Component-scoped global toggle. Absent from the practice engine (which never mounts TopNav),
  // so this listener can never reach the exam keyboard.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (openRef.current) closeSwitcher();
        else openSwitcher();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openSwitcher, closeSwitcher]);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // Focus into the input on open; return focus to the trigger on close.
  useEffect(() => {
    if (open) inputRef.current?.focus();
    else if (wasOpen.current) triggerRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  const items = useMemo<SwitcherItem[]>(() => {
    const all: SwitcherItem[] = registry.map((m) => ({
      certId: m.certId,
      vendorSlug: m.vendorSlug,
      title: m.title,
      vendorLabel: vendorLabel(m.vendorSlug),
      examCode: m.examCode,
      color: vendorColor(m.vendorSlug),
      pct: progressByCert[m.certId]?.pct ?? 0,
      hasProgress: progressByCert[m.certId]?.hasProgress ?? false,
    }));
    const q = query.toLowerCase().trim();
    if (q) {
      return all.filter((it) => `${it.title} ${it.vendorLabel} ${it.examCode}`.toLowerCase().includes(q));
    }
    // Empty query: certs-with-progress first, then the rest, registry order within each group.
    return [...all.filter((it) => it.hasProgress), ...all.filter((it) => !it.hasProgress)];
  }, [registry, progressByCert, query]);

  const hasQuery = query.trim().length > 0;
  // Empty-query cap covers the full 15-cert roster with headroom (the list scrolls);
  // raise again when the registry outgrows 20 - the paired test asserts Math.min(length, 20).
  const rows = useMemo(() => items.slice(0, hasQuery ? 40 : 20), [items, hasQuery]);
  const sectionLabel = hasQuery ? `${items.length} MATCHES` : "CONTINUE";

  // Keep the active index in range as the filtered rows change.
  useEffect(() => {
    setActive((i) => Math.min(i, Math.max(rows.length - 1, 0)));
  }, [rows.length]);

  // Scroll the active row into view (guarded: jsdom does not implement scrollIntoView).
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-row="${active}"]`);
    if (el && typeof el.scrollIntoView === "function") el.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const pick = useCallback(
    (i: number) => {
      const it = rows[i];
      if (!it) return;
      closeSwitcher();
      router.push(certPath(it));
    },
    [rows, router, closeSwitcher],
  );

  function onQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    setActive(0);
  }

  function onDialogKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(active);
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeSwitcher();
    } else if (e.key === "Tab") {
      // Minimal focus trap: the input is the only focusable node in the dialog, so keep focus on it
      // and never let Tab / Shift+Tab escape to the page behind the modal.
      e.preventDefault();
      inputRef.current?.focus();
    }
  }

  // Trigger content: the most-recently-active cert once localStorage hydrates, else the first registry
  // cert with "Browse certs" copy. SSR renders the fallback, so there is no hydration mismatch.
  // Compact-chip sub-line is "Vendor MIDDOT CODE" (the redesign moved readiness off the chip onto the
  // cert page), or the generic "Browse certs" when there is no local history yet.
  const triggerCert = registry.find((m) => m.certId === recentId) ?? registry[0];
  const triggerSub = triggerCert
    ? recentId
      ? `${vendorLabel(triggerCert.vendorSlug)} ${MIDDOT} ${triggerCert.examCode}`
      : "Browse certs"
    : "";

  const listboxId = "sw-listbox";
  const activeId = rows.length ? `sw-opt-${active}` : undefined;

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className="sw-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-keyshortcuts="Meta+K Control+K"
        onClick={openSwitcher}
      >
        <span className="sw-sr">Switch certification</span>
        {triggerCert && (
          <span className="sw-vd" style={{ background: vendorColor(triggerCert.vendorSlug) }} aria-hidden="true" />
        )}
        <span className="sw-trigger-text">
          <span className="sw-tname">{triggerCert?.title ?? "Certifications"}</span>
          <span className="sw-tsub" aria-hidden="true">
            {triggerSub}
          </span>
        </span>
        <span className="sw-switch" aria-hidden="true">Switch {CHEV}</span>
      </button>

      {open && (
        <div
          className="sw-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeSwitcher();
          }}
        >
          <div
            className="sw-cmd"
            role="dialog"
            aria-modal="true"
            aria-label="Switch certification"
            onKeyDown={onDialogKeyDown}
          >
            <div className="sw-top">
              <span className="sw-mono sw-faint" aria-hidden="true">
                {CMDK}
              </span>
              <input
                ref={inputRef}
                className="sw-input"
                type="text"
                role="combobox"
                aria-expanded="true"
                aria-controls={listboxId}
                aria-autocomplete="list"
                aria-activedescendant={activeId}
                placeholder="Jump to a certification..."
                value={query}
                onChange={onQueryChange}
              />
              <span className="sw-mono sw-faint sw-esc" aria-hidden="true">
                esc
              </span>
            </div>
            <div className="sw-sec">{sectionLabel}</div>
            <div className="sw-body" id={listboxId} role="listbox" aria-label="Certifications" ref={listRef}>
              {rows.length ? (
                rows.map((it, i) => (
                  <div
                    key={it.certId}
                    id={`sw-opt-${i}`}
                    data-row={i}
                    role="option"
                    aria-selected={i === active}
                    className={`sw-row${i === active ? " k" : ""}`}
                    onClick={() => pick(i)}
                    onMouseMove={() => setActive(i)}
                  >
                    <span className="sw-vd" style={{ background: it.color }} aria-hidden="true" />
                    <span className="sw-dn">{it.title}</span>
                    {it.hasProgress ? (
                      <span className="sw-dcode sw-gold">
                        {it.pct}% {MIDDOT} resume
                      </span>
                    ) : (
                      <span className="sw-dcode">{it.examCode}</span>
                    )}
                  </div>
                ))
              ) : (
                <div className="sw-empty">No certifications match {`"${query}"`}</div>
              )}
            </div>
            <div className="sw-foot">
              <span>
                <b>{ARROWS}</b> navigate
              </span>
              <span>
                <b>{RETURN}</b> open
              </span>
              <span className="sw-foot-esc">
                <b>esc</b> close
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
