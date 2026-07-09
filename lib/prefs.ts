/**
 * Notification preferences, stored locally under certreps.prefs.v1. These are stored-only
 * intentions for features that have not launched yet (study reminders, new-cert alerts, weekly
 * email) - the Settings copy says as much, so nothing here overpromises. Sync is deliberately NOT
 * a stored pref: it reflects the real session (on while signed in), so a fake toggle can never
 * disagree with reality. Reads are SSR-safe (defaults when there is no window).
 */
export interface Prefs {
  reminders: boolean;
  newCerts: boolean;
  weekly: boolean;
}

const KEY = "certreps.prefs.v1";
const DEFAULTS: Prefs = { reminders: false, newCerts: false, weekly: false };

function coerce(raw: unknown, key: keyof Prefs): boolean {
  const v = (raw as Record<string, unknown> | null)?.[key];
  return typeof v === "boolean" ? v : DEFAULTS[key];
}

/** Current prefs, falling back to defaults for a missing/corrupt store or an SSR read. Every
 *  field is validated independently so a partial/legacy object degrades field-by-field. */
export function readPrefs(): Prefs {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return {
      reminders: coerce(parsed, "reminders"),
      newCerts: coerce(parsed, "newCerts"),
      weekly: coerce(parsed, "weekly"),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

/** Persist the whole prefs object; degrades silently if storage is blocked (in-memory state holds). */
export function writePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* storage full or blocked - nothing else to do */
  }
}

/** Set one pref, persist, and return the merged result (read-modify-write over the current store). */
export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]): Prefs {
  const next: Prefs = { ...readPrefs(), [key]: value };
  writePrefs(next);
  return next;
}

/** Wipe the stored prefs. Used by the Settings "Delete all my data" action so the delete is honest
 *  to its label (progress AND preferences), not just the attempt store. Degrades silently if blocked. */
export function clearPrefs(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* storage blocked - nothing else to do */
  }
}
