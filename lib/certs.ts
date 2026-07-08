import type { CertMeta, Question } from "./types";
import aipc01Bank from "@/content/aip-c01/questions.json";
import aipc01Meta from "@/content/aip-c01/meta.json";
// (mla-c01 imports arrive in Task 5)

export interface CertEntry {
  meta: CertMeta;
  bank: Question[];
}

// Static imports only: Next.js must statically analyze the registry to
// generateStaticParams and prerender each cert's routes. No dynamic fs/require.
// Insertion order is the display order (home cards, sitemap) - Object.values
// preserves it for non-integer string keys. New certs: content files + one entry here.
// meta uses `satisfies` (catches field drift at compile time); the bank must stay a
// cast because JSON widens the type/difficulty unions to plain string (TS1360).
const REGISTRY: Record<string, CertEntry> = {
  "aip-c01": { meta: aipc01Meta satisfies CertMeta, bank: aipc01Bank as Question[] },
};

export function listCerts(): CertMeta[] {
  return Object.values(REGISTRY).map((c) => c.meta);
}

export function getCert(certId: string): CertEntry | null {
  // Object.hasOwn: a plain index would resolve prototype-chain members, so
  // getCert("toString") would return junk instead of null and /aws/toString
  // would 500 instead of 404 through the pages' `getCert() ?? notFound()` guard.
  return Object.hasOwn(REGISTRY, certId) ? REGISTRY[certId] : null;
}
