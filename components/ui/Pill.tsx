import type { CSSProperties, ReactNode } from "react";

export type PillTone = "default" | "level" | "good" | "bad";

export interface PillProps {
  tone?: PillTone;
  children: ReactNode;
  style?: CSSProperties;
}

export function Pill({ tone = "default", children, style = {} }: PillProps) {
  const base: CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: "10.5px",
    letterSpacing: ".08em",
    textTransform: "uppercase",
    borderRadius: "20px",
    padding: "4px 10px",
    whiteSpace: "nowrap",
    display: "inline-block",
  };
  const tones: Record<PillTone, CSSProperties> = {
    default: { border: "1px solid var(--line-strong)", color: "var(--muted)" },
    level: { color: "var(--gold)", border: "1px solid var(--gold-dim)", background: "var(--gold-soft)" },
    good: { color: "var(--emerald)", border: "1px solid var(--emerald)", background: "var(--emerald-soft)" },
    bad: { color: "var(--rose)", border: "1px solid var(--rose)", background: "var(--rose-soft)" },
  };
  return <span style={{ ...base, ...tones[tone], ...style }}>{children}</span>;
}
