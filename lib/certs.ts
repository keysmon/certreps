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
const REGISTRY: Record<string, CertEntry> = {
  "aip-c01": { meta: aipc01Meta as CertMeta, bank: aipc01Bank as Question[] },
};

export function listCerts(): CertMeta[] {
  return Object.values(REGISTRY).map((c) => c.meta);
}

export function getCert(certId: string): CertEntry | null {
  return REGISTRY[certId] ?? null;
}
