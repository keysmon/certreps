"use client";
import "./engine.css";

export interface CellState { answered: boolean; flagged: boolean; }

export function ReviewMap({ states, current, onJump }: { states: CellState[]; current: number; onJump: (i: number) => void }) {
  const unanswered = states.filter((s) => !s.answered).length;
  return (
    <div className="reviewmap">
      <p className="summary">{states.length - unanswered} answered, {unanswered} unanswered, {states.filter((s) => s.flagged).length} flagged</p>
      <div className="mapgrid">
        {states.map((s, i) => (
          <button
            key={i}
            type="button"
            className={`mapcell${s.answered ? " answered" : ""}${s.flagged ? " flagged" : ""}${i === current ? " current" : ""}`}
            onClick={() => onJump(i)}
            aria-label={`Go to question ${i + 1}`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
