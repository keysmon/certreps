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
  // Retain published records for historical grading, but never sample reviewed-out items.
  excludedFromPractice?: boolean;
  exclusionReason?: string;
  supersededBy?: string;
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
  // Whether passLinePct represents an official raw passing percentage. false means
  // it is OUR study target, including exams whose scaled score cannot be converted
  // to a raw percentage (AWS exams). Absent/true retains legacy display behavior.
  passLineOfficial?: boolean;
  verified: string;
  // Real exam facts, separate from the practice configuration and bank review date.
  examDetails?: {
    guideUrl: string;
    examUrl?: string;
    questionCount: string;
    durationMinutes: number;
    passingScore: string;
    questionTypes: string[];
    checkedOn: string;
    statusNote?: string;
  };
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
  // First nonempty answer time; absent on legacy rows and unanswered flags.
  answeredAt?: number;
}

export interface Attempt {
  attemptId: string;
  certId: string;
  mode: Mode;
  domain?: string;            // set for drill
  // A study run: a full mock that reveals + locks each answer as you go, runs untimed, and is
  // excluded from the readiness signal. Absent/false = the timed no-feedback exam mock (the default).
  reveal?: boolean;
  questionIds: string[];      // sampled order
  results: Record<string, QuestionResult>;
  startedAt: number;          // epoch ms
  finishedAt: number | null;
  elapsedSec: number;
  pauseCount: number;
}
