"use client";
import type { Attempt, CertMeta, Question } from "@/lib/types";
import { gradeAttempt } from "@/lib/scoring";

export function Results({ attempt, questions }: { attempt: Attempt; questions: Question[]; meta: CertMeta }) {
  const g = gradeAttempt(attempt, questions);
  return (
    <div className="card">
      <h2>Results</h2>
      <p>{g.score} / {g.total} ({g.pct}%)</p>
    </div>
  );
}
