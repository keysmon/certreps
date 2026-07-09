import type { CertMeta, Question } from "./types";
import aipc01Bank from "@/content/aip-c01/questions.json";
import aipc01Meta from "@/content/aip-c01/meta.json";
import mlac01Bank from "@/content/mla-c01/questions.json";
import mlac01Meta from "@/content/mla-c01/meta.json";
import saac03Bank from "@/content/saa-c03/questions.json";
import saac03Meta from "@/content/saa-c03/meta.json";
import clfc02Bank from "@/content/clf-c02/questions.json";
import clfc02Meta from "@/content/clf-c02/meta.json";
import dvac02Bank from "@/content/dva-c02/questions.json";
import dvac02Meta from "@/content/dva-c02/meta.json";
import sapc02Bank from "@/content/sap-c02/questions.json";
import sapc02Meta from "@/content/sap-c02/meta.json";
import deac01Bank from "@/content/dea-c01/questions.json";
import deac01Meta from "@/content/dea-c01/meta.json";
import soac03Bank from "@/content/soa-c03/questions.json";
import soac03Meta from "@/content/soa-c03/meta.json";
import dopc02Bank from "@/content/dop-c02/questions.json";
import dopc02Meta from "@/content/dop-c02/meta.json";
import scsc03Bank from "@/content/scs-c03/questions.json";
import scsc03Meta from "@/content/scs-c03/meta.json";

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
  "mla-c01": { meta: mlac01Meta satisfies CertMeta, bank: mlac01Bank as Question[] },
  "saa-c03": { meta: saac03Meta satisfies CertMeta, bank: saac03Bank as Question[] },
  "clf-c02": { meta: clfc02Meta satisfies CertMeta, bank: clfc02Bank as Question[] },
  "dva-c02": { meta: dvac02Meta satisfies CertMeta, bank: dvac02Bank as Question[] },
  "sap-c02": { meta: sapc02Meta satisfies CertMeta, bank: sapc02Bank as Question[] },
  "dea-c01": { meta: deac01Meta satisfies CertMeta, bank: deac01Bank as Question[] },
  "soa-c03": { meta: soac03Meta satisfies CertMeta, bank: soac03Bank as Question[] },
  "dop-c02": { meta: dopc02Meta satisfies CertMeta, bank: dopc02Bank as Question[] },
  "scs-c03": { meta: scsc03Meta satisfies CertMeta, bank: scsc03Bank as Question[] },
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
