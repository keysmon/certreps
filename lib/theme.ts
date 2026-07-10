/**
 * Light/dark theme store. Dark is the product default (an explicit product decision), so it
 * carries NO `data-theme` attribute - only light sets `data-theme="light"` on <html>. That keeps
 * the no-flash inline script in app/layout.tsx tiny and inert for the common (dark) case. The
 * preference lives under certreps.theme, per device. Every function is SSR-safe: it degrades to the
 * dark default when there is no window/document, so importing this module never touches the DOM.
 */
export type Theme = "light" | "dark";

const STORAGE_KEY = "certreps.theme";

/** The stored theme. Absent or unrecognized = "dark" (the default). SSR-safe. */
export function getTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    return localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

/** Reflect the theme on <html>: light sets data-theme="light"; dark removes the attribute
 *  (dark is the default and needs none - this is exactly what the no-flash script does). SSR-safe. */
export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "light") root.setAttribute("data-theme", "light");
  else root.removeAttribute("data-theme");
}

/** Persist the preference and apply it. Degrades silently if storage is blocked - the applied
 *  attribute still holds for the current session. */
export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* storage full or blocked - the applied attribute below still takes effect */
  }
  applyTheme(theme);
}

/** Flip the current theme, persist + apply it, and return the new value. */
export function toggleTheme(): Theme {
  const next: Theme = getTheme() === "light" ? "dark" : "light";
  setTheme(next);
  return next;
}
