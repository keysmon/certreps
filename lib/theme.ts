/**
 * Color-theme store. Five themes (the redesign's "swappable color themes"): Signal Gold is the
 * product default and carries NO `data-theme` attribute - only the four alternates set one on <html>
 * (data-theme="ocean|violet|graphite|day"). Keeping the default attribute-less mirrors the old
 * dark-is-default design and keeps the no-flash inline script in app/layout.tsx tiny for the common
 * case. The preference lives under certreps.theme, per device. Every function is SSR-safe: it degrades
 * to Signal Gold when there is no window/document, so importing this module never touches the DOM.
 *
 * Legacy migration: the previous two-theme store wrote "dark"/"light". Those still round-trip -
 * "dark" reads as Signal Gold (the default), "light" as Daylight - so an upgrading user keeps their
 * pick. The value is rewritten to the canonical name the next time they choose a theme. The no-flash
 * script performs the same mapping inline.
 */
export const THEMES = ["signal", "ocean", "violet", "graphite", "day"] as const;
export type Theme = (typeof THEMES)[number];

/** User-facing labels for the theme picker, in display order. */
export const THEME_LABELS: Record<Theme, string> = {
  signal: "Signal Gold",
  ocean: "Deep Ocean",
  violet: "Ultraviolet",
  graphite: "Graphite",
  day: "Daylight",
};

const STORAGE_KEY = "certreps.theme";

/** Map any stored value (incl. the legacy "dark"/"light") to a canonical Theme; unknown -> "signal". */
function normalize(raw: string | null): Theme {
  if (raw === "dark") return "signal"; // legacy default
  if (raw === "light") return "day"; // legacy light
  return (THEMES as readonly string[]).includes(raw ?? "") ? (raw as Theme) : "signal";
}

/** The stored theme. Absent/unrecognized = "signal" (the default). SSR-safe. */
export function getTheme(): Theme {
  if (typeof window === "undefined") return "signal";
  try {
    return normalize(localStorage.getItem(STORAGE_KEY));
  } catch {
    return "signal";
  }
}

/** Reflect the theme on <html>: the four alternates set data-theme; Signal Gold removes the attribute
 *  (it is the default and needs none - exactly what the no-flash script does). SSR-safe. */
export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "signal") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

/** Persist the preference (canonical name) and apply it. Degrades silently if storage is blocked -
 *  the applied attribute still holds for the current session. */
export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* storage full or blocked - the applied attribute below still takes effect */
  }
  applyTheme(theme);
}
