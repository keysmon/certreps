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
}

export interface DomainMeta {
  name: string;
  tag: string;
  weightPct: number;
  mockCount: number;
}

export interface CertMeta {
  certId: string;
  vendor: string;
  title: string;
  examCode: string;
  level: string;
  mockQuestionCount: number;
  mockMinutes: number;
  passLinePct: number;
  verified: string;
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
