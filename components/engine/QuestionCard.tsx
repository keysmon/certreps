"use client";
import { useMemo, useState } from "react";
import type { Question } from "@/lib/types";
import { optionPermutation } from "@/lib/permute";
import { ReportProblem } from "@/components/ReportProblem";
import "./engine.css";

const LETTERS = ["A", "B", "C", "D", "E"];
const CHECK = String.fromCharCode(10003);
const CROSS = String.fromCharCode(10007);

export interface GradedView {
  chosen: number[];
  correct: boolean;
}

export function QuestionCard({
  question,
  graded,
  onSubmit,
  attemptId,
  index,
  total,
  vendorName,
}: {
  question: Question;
  graded: GradedView | null;
  onSubmit: (chosen: number[]) => void;
  attemptId: string;
  index?: number;
  total?: number;
  /** Vendor display name for the doc-link label ("Read the {vendorName} docs"). A
   *  hardcoded "AWS" here shipped on every non-AWS question when v1g added vendors. */
  vendorName: string;
}) {
  const [chosen, setChosen] = useState<number[]>([]);
  const [lastQid, setLastQid] = useState(question.id);
  // Attempt-seeded display order (view layer only). perm[viewPos] = canonicalIndex; every value we
  // read/write below (chosen, question.correct, onSubmit) stays canonical - only render order and the
  // A/B/C/D/E letters follow the permutation. Stable per (attempt, question), so resume/recap/review
  // reproduce the same order without any stored state.
  const perm = useMemo(
    () => optionPermutation(attemptId, question.id, question.options.length),
    [attemptId, question.id, question.options.length],
  );
  if (lastQid !== question.id) {
    // Reset selection when the question changes so a reused instance cannot submit stale choices.
    setLastQid(question.id);
    setChosen([]);
  }
  const isMulti = question.type === "multi";
  const view = graded ? graded.chosen : chosen;

  function toggle(i: number) {
    if (graded) return;
    if (isMulti) {
      setChosen((c) => (c.includes(i) ? c.filter((x) => x !== i) : c.length >= 2 ? c : [...c, i].sort((a, b) => a - b)));
    } else {
      setChosen([i]);
    }
  }

  return (
    <div className="qcard">
      <div className="qmeta">
        <span className="qtag">{question.tag}</span>
        {index !== undefined && total !== undefined && (
          <span className="qnum">Question {index + 1} of {total}</span>
        )}
      </div>
      <p className="qstem">{question.stem}</p>
      {isMulti && <p className="qhint">Select TWO</p>}
      <div className="options" role="group" aria-label={isMulti ? "Answer choices - choose two" : "Answer choices"}>
        {perm.map((ci, vi) => {
          const text = question.options[ci];
          const isKey = question.correct.includes(ci);
          const wasChosen = view.includes(ci);
          const base = graded
            ? isKey ? "option correct" : wasChosen ? "option incorrect" : "option dim"
            : wasChosen ? "option selected" : "option";
          const cls = isMulti ? `${base} multi` : base;
          return (
            <button key={ci} type="button" className={cls} aria-pressed={wasChosen} disabled={!!graded} onClick={() => toggle(ci)}>
              <span className="marker">{graded ? (isKey ? CHECK : wasChosen ? CROSS : LETTERS[vi]) : LETTERS[vi]}</span>
              <span>{text}</span>
            </button>
          );
        })}
      </div>
      {graded && (
        <div className={`explain ${graded.correct ? "right" : "wrong"}`} role="status" aria-live="polite">
          <p className="verdict">{graded.correct ? `${CHECK} Correct` : `${CROSS} Not quite`}</p>
          {/* Safe: trusted build-time content from our own pipeline (<b>/<em> only), never user input. */}
          <p dangerouslySetInnerHTML={{ __html: question.explanation }} />
          <a className="doclink" href={question.docUrl} target="_blank" rel="noopener noreferrer">
            Read the {vendorName} docs {String.fromCharCode(8594)}
          </a>
          <div style={{ marginTop: 12 }}>
            <ReportProblem questionId={question.id} />
          </div>
        </div>
      )}
      {!graded && (
        <div className="footbar">
          <button className="btn btn-primary" style={{ marginLeft: "auto" }} disabled={chosen.length === 0} onClick={() => onSubmit(chosen)}>
            Submit answer
          </button>
        </div>
      )}
    </div>
  );
}
