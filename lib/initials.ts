/**
 * Up-to-two-letter avatar monogram from a label (email or display name). Splits an email on its
 * local part and a name on whitespace/separators; two words -> two initials, otherwise the first
 * two characters. Returns "" for an empty label so callers can render a blank avatar. Exercised
 * through the TopNav and Settings surfaces that render it.
 */
export function initials(label?: string | null): string {
  if (!label) return "";
  const base = label.includes("@") ? label.split("@")[0] : label;
  const parts = base.split(/[\s._+-]+/).filter(Boolean);
  const raw = parts.length >= 2 ? parts[0][0] + parts[1][0] : base.slice(0, 2);
  return raw.toUpperCase();
}
