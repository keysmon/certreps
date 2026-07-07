"use client";
import { useCallback, useMemo, useRef, useState } from "react";
import type { Attempt, Mode, Question } from "@/lib/types";
import { getBank, getMeta } from "@/lib/bank";
import { sampleDrill, sampleMock, sampleQuick, questionsByIds } from "@/lib/sampler";
import { createAttempt, saveAttempt, recordResult, finishAttempt, missedQuestionIds, getAttempt } from "@/lib/storage";
import { isCorrect } from "@/lib/scoring";
import { QuestionCard } from "./QuestionCard";
import { Timer } from "./Timer";
import { Results } from "./Results";
import { ReviewMap } from "./ReviewMap";
import "./engine.css";

const QUICK_N = 10;
const DRILL_N = 12;

export function ExamEngine({ mode, domain }: { mode: Mode; domain?: string }) {
  const bank = getBank();
  const meta = getMeta();
  const isMock = mode === "mock";

  const questions: Question[] = useMemo(() => {
    if (mode === "quick") return sampleQuick(bank, QUICK_N);
    if (mode === "drill" && domain) return sampleDrill(bank, domain, DRILL_N);
    if (mode === "retry") return questionsByIds(bank, missedQuestionIds(meta.certId));
    if (mode === "mock") return sampleMock(bank, meta);
    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Sampled once per mount; callers must key ExamEngine by mode+domain (see PracticeClient,
  // Task 15) - prop changes without remount are ignored.

  // Contract C1 (Task 5 review): saveAttempt exactly once here; recordResult/finishAttempt thereafter.
  // NEVER re-save the engine-held copy - it would clobber recorded results.
  // Lazy-ref init (React docs "avoiding recreating the ref contents"): a useRef(IIFE()) initializer
  // is RE-EVALUATED every render, which fired saveAttempt on each render (21x in the loop) and
  // violated C1; the null-guard runs createAttempt/saveAttempt exactly once on the first render.
  const attemptRef = useRef<Attempt | null>(null);
  if (attemptRef.current === null && questions.length) {
    const a = createAttempt(meta.certId, mode, questions.map((qq) => qq.id), domain);
    saveAttempt(a);
    attemptRef.current = a;
  }

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"question" | "review" | "results">("question");
  // In-memory UI projection of attempt.results (write-through journal); a future resume feature
  // seeds this from getAttempt(...).results - do not read storage during render.
  const [graded, setGraded] = useState<Record<string, { chosen: number[]; correct: boolean }>>({});
  const [answers, setAnswers] = useState<Record<string, number[]>>({}); // mock: chosen without reveal
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const elapsedRef = useRef(0);
  const pausesRef = useRef(0);

  const q = questions[index];

  // Contract C3 (Task 10 review): memoize every Timer handler - inline arrows would reset the
  // Timer interval each render and drop partial seconds.
  const handleTick = useCallback((e: number) => { elapsedRef.current = e; }, []);
  const handlePause = useCallback(() => { pausesRef.current += 1; }, []);

  // Practice: grade immediately. Mock: record silently.
  const submit = useCallback(
    (chosen: number[]) => {
      if (!q || !attemptRef.current) return;
      const correct = isCorrect(chosen, q.correct);
      if (isMock) {
        setAnswers((a) => ({ ...a, [q.id]: chosen }));
      } else {
        setGraded((g) => ({ ...g, [q.id]: { chosen, correct } }));
      }
      recordResult(attemptRef.current.attemptId, { questionId: q.id, chosen, correct, flagged: !!flags[q.id] });
    },
    [q, isMock, flags]
  );

  const finish = useCallback(() => {
    if (attemptRef.current) finishAttempt(attemptRef.current.attemptId, elapsedRef.current, pausesRef.current);
    setPhase("results");
  }, []);

  const toggleFlag = useCallback(() => {
    if (!q || !attemptRef.current) return;
    const next = !flags[q.id];
    setFlags((f) => ({ ...f, [q.id]: next }));
    const chosen = answers[q.id];
    if (chosen) {
      recordResult(attemptRef.current.attemptId, {
        questionId: q.id, chosen, correct: isCorrect(chosen, q.correct), flagged: next,
      });
    }
  }, [q, flags, answers]);

  if (questions.length === 0) {
    return (
      <div className="card">
        <p>{mode === "retry" ? "No missed questions yet - take a practice run first." : "No questions available."}</p>
        <a className="btn btn-ghost" href={`/aws/${meta.certId}`}>Back to {meta.examCode}</a>
      </div>
    );
  }

  if (phase === "results" && attemptRef.current) {
    const attempt = getAttempt(attemptRef.current.attemptId) ?? attemptRef.current;
    return <Results attempt={attempt} questions={questions} meta={meta} />;
  }

  if (phase === "review") {
    const states = questions.map((qq) => ({ answered: !!answers[qq.id], flagged: !!flags[qq.id] }));
    return (
      <div>
        <h2>Review your answers</h2>
        {/* Contract C7 (Task 11 review): the Submit button precedes the map in DOM order so
            keyboard users are not forced to tab through 65 cells to reach it. */}
        <button className="btn btn-primary" onClick={finish}>Submit exam</button>
        <div data-testid="reviewmap">
          <ReviewMap states={states} current={index} onJump={(i) => { setIndex(i); setPhase("question"); }} />
        </div>
      </div>
    );
  }

  const g = isMock ? null : graded[q.id] ?? null;
  const last = index === questions.length - 1;
  const answeredThis = isMock && !!answers[q.id];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12 }}>
        <span className="eyebrow">{meta.examCode} - {isMock ? "Full Mock" : mode}</span>
        <Timer
          initialElapsedSec={0}
          countdownSec={isMock ? meta.mockMinutes * 60 : null}
          onTick={handleTick}
          onExpire={finish}
          onPause={handlePause}
        />
      </div>

      {/* Contract C2 (Task 9 review): QuestionCard renders in a bare div - never inside .card
          (its .qnum text fails AA contrast on a --panel-background surface). */}
      <QuestionCard
        key={q.id + String(answeredThis)}
        question={q}
        graded={g}
        onSubmit={submit}
        index={index}
        total={questions.length}
      />

      {isMock && (
        <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
          <button className="btn btn-ghost" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>Prev</button>
          <button className="btn btn-ghost" disabled={last} onClick={() => setIndex((i) => i + 1)}>Next</button>
          <button className="btn btn-ghost" onClick={toggleFlag}>
            {flags[q.id] ? "Unflag" : "Flag for review"}
          </button>
          <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={() => setPhase("review")}>
            Review & submit
          </button>
        </div>
      )}

      {!isMock && g && (
        <button className="btn btn-primary" onClick={() => (last ? finish() : setIndex((i) => i + 1))}>
          {last ? "See results" : "Next question"}
        </button>
      )}
    </div>
  );
}
