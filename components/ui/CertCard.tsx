import type { CSSProperties } from "react";
import Link from "next/link";
import type { CertMeta } from "@/lib/types";
import { VendorDot, VENDORS } from "./VendorDot";
import { Pill } from "./Pill";

// ASCII-source convention (see Results.tsx): the JSX source uses a literal arrow.
const ARROW = String.fromCharCode(8594); // U+2192 rightwards arrow

export interface CertCardProps {
  /** The card is typed against OUR CertMeta, not the prototype's cert shape. */
  meta: Pick<CertMeta, "certId" | "vendor" | "examCode" | "title" | "level">;
  /** Real navigation target - the card is an anchor, not a clickable div. */
  href: string;
  /** Readiness percent from local progress; > 0 flips the footer to Resume. */
  progress?: number;
  /** Question count shown in the zero-progress footer. */
  questions?: number;
  style?: CSSProperties;
}

export function CertCard({ meta, href, progress = 0, questions, style = {} }: CertCardProps) {
  // vendor values are human-readable ("AWS"); the VENDORS map is keyed by lowercase
  // slug. Normalize to look up the accent, falling back to gold + the raw string for
  // vendors not yet in the map (only AWS ships live content today).
  const vendor = VENDORS[meta.vendor.toLowerCase()];
  const accent = vendor?.c ?? "var(--gold)";
  const vendorName = vendor?.n ?? meta.vendor;

  return (
    <Link
      href={href}
      aria-label={meta.title}
      style={{
        position: "relative",
        background: "var(--panel)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius)",
        padding: "18px 18px 15px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        color: "var(--text)",
        textDecoration: "none",
        ...style,
      }}
    >
      <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "3px", background: accent }} />
      <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "11px" }}>
        <VendorDot color={accent} />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: ".06em", color: "var(--muted)" }}>{vendorName}</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "10.5px", color: "var(--faint)", marginLeft: "auto" }}>{meta.examCode}</span>
      </div>
      <h3 style={{ fontFamily: "var(--font-display)", fontSize: "16.5px", fontWeight: 700, lineHeight: 1.2, margin: "0 0 12px", minHeight: "40px" }}>{meta.title}</h3>
      <div style={{ display: "flex", alignItems: "center", gap: "7px", flexWrap: "wrap", marginBottom: "14px" }}>
        {meta.level && <Pill tone="level">{meta.level}</Pill>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", borderTop: "1px solid var(--line)", paddingTop: "12px", marginTop: "auto" }}>
        {progress > 0 ? (
          <>
            <div style={{ flex: 1, height: "5px", background: "var(--panel-3)", borderRadius: "3px", overflow: "hidden" }}>
              <span style={{ display: "block", height: "100%", width: progress + "%", background: "var(--gold)", borderRadius: "3px" }} />
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10.5px", color: "var(--muted)" }}>{progress}%</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--gold)", fontWeight: 600 }}>Resume {ARROW}</span>
          </>
        ) : (
          <>
            {questions != null && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--faint)" }}>{questions} Q</span>
            )}
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--gold)", fontWeight: 600, marginLeft: "auto" }}>Practice {ARROW}</span>
          </>
        )}
      </div>
    </Link>
  );
}
