import type { CertMeta } from "./types";

// Canonical internal URL builders. certId is globally unique; vendorSlug is the routing
// segment (and VENDORS lookup key). Every computed cert link routes through these so the
// /[vendor]/[certId] structure has one source of truth - never hardcode "/aws/..." again.
// Type-only CertMeta import: erased at build, so importing this adds zero runtime weight.
type CertRef = Pick<CertMeta, "vendorSlug" | "certId">;

export function certPath(c: CertRef): string {
  return `/${c.vendorSlug}/${c.certId}`;
}

export function practicePath(c: CertRef): string {
  return `/${c.vendorSlug}/${c.certId}/practice`;
}
