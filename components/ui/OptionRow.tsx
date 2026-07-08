import type { CSSProperties, MouseEventHandler, ReactNode } from "react";

export type OptionState = "idle" | "selected" | "correct" | "incorrect" | "dim";

// ASCII-source convention (matches Results.tsx): the JSX source uses literal
// unicode check/cross; ported to fromCharCode so this file stays pure ASCII.
const CHECK = String.fromCharCode(10003); // U+2713 check mark
const CROSS = String.fromCharCode(10007); // U+2717 ballot x

export interface OptionRowProps {
  letter?: string;
  state?: OptionState;
  children: ReactNode;
  onClick?: MouseEventHandler;
  style?: CSSProperties;
}

export function OptionRow({ letter = "A", state = "idle", children, onClick, style = {} }: OptionRowProps) {
  const wrap: CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    gap: "13px",
    background: "var(--panel)",
    // Longhand (not the `border` shorthand) so the state overrides below can set
    // borderColor alone without React's shorthand/longhand rerender warning.
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--line)",
    borderRadius: "var(--radius-sm)",
    padding: "15px 16px",
    textAlign: "left",
    width: "100%",
    fontSize: "15px",
    color: "var(--text)",
    fontFamily: "var(--font-sans)",
    cursor: onClick ? "pointer" : "default",
    transition: ".12s",
  };
  const states: Record<OptionState, CSSProperties> = {
    idle: {},
    selected: { borderColor: "var(--gold)", background: "var(--gold-soft)" },
    correct: { borderColor: "var(--emerald)", background: "var(--emerald-soft)" },
    incorrect: { borderColor: "var(--rose)", background: "var(--rose-soft)" },
    dim: { opacity: 0.5 },
  };
  const marker: CSSProperties = {
    flexShrink: 0,
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    fontFamily: "var(--font-mono)",
    fontSize: "12px",
    // Longhand so markerStates can override borderColor cleanly (see wrap above).
    borderWidth: "1.5px",
    borderStyle: "solid",
    borderColor: "var(--line-strong)",
    color: "var(--muted)",
  };
  const markerStates: Partial<Record<OptionState, CSSProperties>> = {
    selected: { borderColor: "var(--gold)", background: "var(--gold)", color: "var(--on-gold)", fontWeight: 700 },
    correct: { borderColor: "var(--emerald)", background: "var(--emerald)", color: "var(--on-emerald)" },
    incorrect: { borderColor: "var(--rose)", background: "var(--rose)", color: "var(--on-rose)" },
  };
  const glyph = state === "correct" ? CHECK : state === "incorrect" ? CROSS : letter;
  return (
    <button type="button" onClick={onClick} style={{ ...wrap, ...states[state], ...style }}>
      <span style={{ ...marker, ...(markerStates[state] || {}) }}>{glyph}</span>
      <span>{children}</span>
    </button>
  );
}
