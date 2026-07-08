"use client";
import { useState } from "react";
import type { Question } from "@/lib/types";
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
  index,
  total,
}: {
  question: Question;
  graded: GradedView | null;
  onSubmit: (chosen: number[]) => void;
  index?: number;
  total?: number;
}) {
  const [chosen, setChosen] = useState<number[]>([]);
  const [lastQid, setLastQid] = useState(question.id);
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
        {question.options.map((text, i) => {
          const isKey = question.correct.includes(i);
          const wasChosen = view.includes(i);
          const base = graded
            ? isKey ? "option correct" : wasChosen ? "option incorrect" : "option dim"
            : wasChosen ? "option selected" : "option";
          const cls = isMulti ? `${base} multi` : base;
          return (
            <button key={i} type="button" className={cls} aria-pressed={wasChosen} disabled={!!graded} onClick={() => toggle(i)}>
              <span className="marker">{graded ? (isKey ? CHECK : wasChosen ? CROSS : LETTERS[i]) : LETTERS[i]}</span>
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
            Read the AWS docs {String.fromCharCode(8594)}
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
