export type Difficulty = "easy" | "medium" | "hard";
export type QuestionType = "single" | "multi";
export type Mode = "quick" | "drill" | "mock" | "retry";

export interface Question {
  id: string;
  domain: string;
  tag: string;
  type: QuestionType;
  stem: string;
  options: string[];
  correct: number[];
  explanation: string;
  difficulty: Difficulty;
  docUrl: string;
  // Closed-vocabulary subtopic tag (see pipeline/concept_enums.json). Present on
  // questions added during/after the 2026-07 bank expansion; absent on older ones.
  // Additive: the app does not yet read it (Project B - adaptive frequency - will).
  concept?: string;
}

export interface DomainMeta {
  name: string;
  tag: string;
  weightPct: number;
  mockCount: number;
}

export interface CertMeta {
  certId: string;
  // Display name ("AWS", "Google Cloud") - kept for display/back-compat fallback.
  vendor: string;
  // Routing segment AND VENDORS lookup key (lowercase slug, e.g. "aws"). The cert's
  // canonical URL is /[vendorSlug]/[certId]; every VENDORS color/name lookup keys off this.
  vendorSlug: string;
  title: string;
  examCode: string;
  level: string;
  mockQuestionCount: number;
  mockMinutes: number;
  passLinePct: number;
  // Whether the vendor publishes an OFFICIAL passing score. Absent or true: the vendor
  // publishes one and passLinePct is our mapped approximation of it. false: the vendor
  // publishes no official passing score, so passLinePct is OUR study target, not a claim.
  passLineOfficial?: boolean;
  verified: string;
  // SERP-budget title/description for the cert landing page. The page is a pure
  // template over these: seoDescription carries a {n} placeholder for the mock
  // question count so the copy stays in the content layer, not the route code.
  seoTitle: string;
  seoDescription: string;
  domains: DomainMeta[];
}

export interface QuestionResult {
  questionId: string;
  chosen: number[];
  correct: boolean;
  flagged: boolean;
}

export interface Attempt {
  attemptId: string;
  certId: string;
  mode: Mode;
  domain?: string;            // set for drill
  questionIds: string[];      // sampled order
  results: Record<string, QuestionResult>;
  startedAt: number;          // epoch ms
  finishedAt: number | null;
  elapsedSec: number;
  pauseCount: number;
}
