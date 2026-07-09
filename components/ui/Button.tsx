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

// Thin wrapper over the canonical .btn family (globals.css) - Task 10 reconciliation collapsed the
// old inline-style variants onto those classes so there is one button source. Disabled primary
// styling comes from `.btn-primary:disabled`; `style` stays an ad-hoc override passthrough.
export function Button({
  variant = "primary",
  size = "md",
  href,
  children,
  onClick,
  disabled = false,
  style,
  type = "button",
  className,
  title,
  target,
  rel,
  "aria-label": ariaLabel,
}: ButtonProps) {
  const cls = ["btn", `btn-${variant}`, size === "sm" ? "btn-sm" : "", className]
    .filter(Boolean)
    .join(" ");

  if (href && !disabled) {
    return (
      <a href={href} onClick={onClick} className={cls} style={style} title={title} target={target} rel={rel} aria-label={ariaLabel}>
        {children}
      </a>
    );
  }
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={cls}
      style={style}
      title={title}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}
