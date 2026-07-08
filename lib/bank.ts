import type { CertMeta, Question } from "./types";
import { getCert } from "./certs";

const DEFAULT_CERT = "aip-c01";

// certId defaults to aip-c01 so existing no-arg callers are unchanged; new
// callers pass certId explicitly. Unknown certs throw (routes guard with
// getCert() ?? notFound() before ever reaching here).
export function getBank(certId: string = DEFAULT_CERT): Question[] {
  const cert = getCert(certId);
  if (!cert) throw new Error(`Unknown certId: ${certId}`);
  return cert.bank;
}

export function getMeta(certId: string = DEFAULT_CERT): CertMeta {
  const cert = getCert(certId);
  if (!cert) throw new Error(`Unknown certId: ${certId}`);
  return cert.meta;
}

export function byDomain(bank: Question[]): Record<string, Question[]> {
  const out: Record<string, Question[]> = {};
  for (const q of bank) (out[q.domain] ??= []).push(q);
  return out;
}
