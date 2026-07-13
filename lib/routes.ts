import type { Attempt, CertMeta } from "./types";

// Canonical internal URL builders. certId is globally unique; vendorSlug is the routing
// segment (and VENDORS lookup key). Every computed cert link routes through these so the
// /[vendor]/[certId] structure has one source of truth - never hardcode "/aws/..." again.
// Type-only CertMeta import: erased at build, so importing this adds zero runtime weight.
type CertRef = Pick<CertMeta, "vendorSlug" | "certId">;

// Segments are assumed URL-safe: vendorSlug/certId are controlled kebab-case (enforced
// by the registry test); only appended query params (e.g. domain) need encoding at call sites.
export function certPath(c: CertRef): string {
  return `/${c.vendorSlug}/${c.certId}`;
}

export function practicePath(c: CertRef): string {
  return `/${c.vendorSlug}/${c.certId}/practice`;
}

// Resume-URL query string for an unfinished attempt. The single builder every resume link routes
// through (detail page, account, review-past, and the practice interstitial), so a new attempt
// dimension - here `reveal` for study runs - is added in exactly one place. Type-only Attempt import,
// so this adds zero runtime weight.
export function resumeParams(a: Pick<Attempt, "mode" | "attemptId" | "domain" | "reveal">): string {
  const p = new URLSearchParams({ mode: a.mode, resume: a.attemptId });
  if (a.domain) p.set("domain", a.domain);
  if (a.reveal) p.set("reveal", "1");
  return p.toString();
}
