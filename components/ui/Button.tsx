import type { CSSProperties, MouseEventHandler, ReactNode } from "react";

export type ButtonVariant = "primary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

/** Explicit prop surface (no `...rest` spread): the kit's consumers are our own
 *  pages, so an enumerated interface stays type-safe across both the <a> and
 *  <button> render paths rather than casting a shared attribute bag onto each. */
export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** When set and not disabled, renders a real <a>; a disabled href renders an inert <button>. */
  href?: string;
  children: ReactNode;
  onClick?: MouseEventHandler;
  disabled?: boolean;
  style?: CSSProperties;
  type?: "button" | "submit" | "reset";
  className?: string;
  title?: string;
  target?: string;
  rel?: string;
  "aria-label"?: string;
}

export function Button({
  variant = "primary",
  size = "md",
  href,
  children,
  onClick,
  disabled = false,
  style = {},
  type = "button",
  className,
  title,
  target,
  rel,
  "aria-label": ariaLabel,
}: ButtonProps) {
  const base: CSSProperties = {
    fontFamily: "var(--font-sans)",
    fontWeight: 600,
    border: "none",
    borderRadius: size === "sm" ? "9px" : "11px",
    padding: size === "sm" ? "8px 14px" : "12px 20px",
    fontSize: size === "sm" ? "13px" : "14.5px",
    cursor: disabled ? "not-allowed" : "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "9px",
    textDecoration: "none",
    transition: ".14s",
    lineHeight: 1.2,
  };
  const variants: Record<ButtonVariant, CSSProperties> = {
    primary: disabled
      ? { background: "var(--panel-3)", color: "var(--faint)", boxShadow: "none" }
      : { background: "var(--gold)", color: "var(--on-gold)", boxShadow: "var(--shadow-gold)" },
    ghost: { background: "transparent", color: "var(--text)", border: "1px solid var(--line-strong)" },
    danger: { background: "transparent", color: "var(--rose)", border: "1px solid var(--rose)" },
  };
  const mergedStyle: CSSProperties = { ...base, ...variants[variant], ...style };

  if (href && !disabled) {
    return (
      <a href={href} onClick={onClick} style={mergedStyle} className={className} title={title} target={target} rel={rel} aria-label={ariaLabel}>
        {children}
      </a>
    );
  }
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      style={mergedStyle}
      className={className}
      title={title}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}
