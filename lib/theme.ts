/** Per-device color choices. Industrial is the default; existing saved palettes remain available.
 * Legacy dark/light values still map to Signal Gold/Daylight. All functions are SSR-safe. */
export const THEMES = ["industrial", "signal", "ocean", "violet", "graphite", "day"] as const;
export type Theme = (typeof THEMES)[number];

/** User-facing labels for the theme picker, in display order. */
export const THEME_LABELS: Record<Theme, string> = {
  industrial: "Industrial",
  signal: "Signal Gold",
  ocean: "Deep Ocean",
  violet: "Ultraviolet",
  graphite: "Graphite",
  day: "Daylight",
};

const STORAGE_KEY = "certreps.theme";

/** Map any stored value (incl. the legacy "dark"/"light") to a canonical Theme; unknown -> "industrial". */
function normalize(raw: string | null): Theme {
  if (raw === "dark") return "signal"; // legacy default
  if (raw === "light") return "day"; // legacy light
  return (THEMES as readonly string[]).includes(raw ?? "") ? (raw as Theme) : "industrial";
}

/** The stored theme. Absent/unrecognized = "industrial" (the default). SSR-safe. */
export function getTheme(): Theme {
  if (typeof window === "undefined") return "industrial";
  try {
    return normalize(localStorage.getItem(STORAGE_KEY));
  } catch {
    return "industrial";
  }
}

/** Industrial uses the root palette; alternate choices use data-theme. SSR-safe. */
export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "industrial") root.removeAttribute("data-theme");
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
