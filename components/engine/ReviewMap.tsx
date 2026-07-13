"use client";
import "./engine.css";

// Answered carries a check glyph so answered-vs-unanswered is distinguishable without color
// (fromCharCode per the repo's ASCII-source convention, same U+2713 as QuestionCard/Results).
// Flagged is a CSS corner triangle (see .mc-flag) - a font-free shape cue; current is a ring.
// Every state thus reads without relying on hue (a11y).
const CHECK = String.fromCharCode(10003);

export interface CellState {
  answered: boolean;
  flagged: boolean;
}

export function ReviewMap({ states, current, onJump }: { states: CellState[]; current: number; onJump: (i: number) => void }) {
  const unanswered = states.filter((s) => !s.answered).length;
  const flagged = states.filter((s) => s.flagged).length;
  return (
    <div className="reviewmap">
      <p className="summary">
        {states.length - unanswered} answered, {unanswered} unanswered{flagged > 0 ? `, ${flagged} flagged` : ""}
      </p>
      <div className="mapgrid">
        {states.map((s, i) => (
          <button
            key={i}
            type="button"
            className={`mapcell${s.answered ? " answered" : ""}${s.flagged ? " flagged" : ""}${i === current ? " current" : ""}`}
            onClick={() => onJump(i)}
            aria-label={`Go to question ${i + 1}${s.answered ? "" : ", unanswered"}${s.flagged ? ", flagged" : ""}${i === current ? ", current" : ""}`}
          >
            <span className="mc-num">{i + 1}</span>
            {s.answered && <span className="mc-check" aria-hidden="true">{CHECK}</span>}
            {s.flagged && <span className="mc-flag" aria-hidden="true" />}
          </button>
        ))}
      </div>
    </div>
  );
}
