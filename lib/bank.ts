import type { CertMeta, Question } from "./types";
import questionsJson from "@/content/aip-c01/questions.json";
import metaJson from "@/content/aip-c01/meta.json";

export function getBank(): Question[] {
  return questionsJson as unknown as Question[];
}

export function getMeta(): CertMeta {
  return metaJson as unknown as CertMeta;
}

export function byDomain(bank: Question[]): Record<string, Question[]> {
  const out: Record<string, Question[]> = {};
  for (const q of bank) (out[q.domain] ??= []).push(q);
  return out;
}
