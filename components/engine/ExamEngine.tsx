"use client";
import { useCallback, useMemo, useRef, useState } from "react";
import type { Attempt, Mode, Question } from "@/lib/types";
import { getBank, getMeta } from "@/lib/bank";
import { sampleDrill, sampleQuick, sampleMock, questionsByIds } from "@/lib/sampler";
import { createAttempt, saveAttempt, recordResult, finishAttempt, missedQuestionIds, getAttempt } from "@/lib/storage";
import { isCorrect } from "@/lib/scoring";
import { QuestionCard } from "./QuestionCard";
import { Timer } from "./Timer";
import { Results } from "./Results";
import "./engine.css";

const QUICK_N = 10;
const DRILL_N = 12;

export function ExamEngine({ mode, domain }: { mode: Mode; domain?: string }) {
  const bank = getBank();
  const meta = getMeta();

  const questions: Question[] = useMemo(() => {
    if (mode === "quick") return sampleQuick(bank, QUICK_N);
    if (mode === "drill" && domain) return sampleDrill(bank, domain, DRILL_N);
    if (mode === "retry") return questionsByIds(bank, missedQuestionIds(meta.certId));
    if (mode === "mock") return sampleMock(bank, meta);
    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // sampled once per mount

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
  const [phase, setPhase] = useState<"question" | "results">("question");
  const [graded, setGraded] = useState<Record<string, { chosen: number[]; correct: boolean }>>({});
  const elapsedRef = useRef(0);
  const pausesRef = useRef(0);

  const q = questions[index];

  // Contract C3 (Task 10 review): memoize every Timer handler - inline arrows would reset the
  // Timer interval each render and drop partial seconds.
  const handleTick = useCallback((e: number) => { elapsedRef.current = e; }, []);
  const handlePause = useCallback(() => { pausesRef.current += 1; }, []);

  const submit = useCallback(
    (chosen: number[]) => {
      if (!q || !attemptRef.current) return;
      const correct = isCorrect(chosen, q.correct);
      setGraded((g) => ({ ...g, [q.id]: { chosen, correct } }));
      recordResult(attemptRef.current.attemptId, { questionId: q.id, chosen, correct, flagged: false });
    },
    [q]
  );

  const finish = useCallback(() => {
    if (attemptRef.current) finishAttempt(attemptRef.current.attemptId, elapsedRef.current, pausesRef.current);
    setPhase("results");
  }, []);

  if (questions.length === 0) {
    return (
      <div className="card">
        <p>{mode === "retry" ? "No missed questions yet - take a practice run first." : "No questions available."}</p>
      </div>
    );
  }

  if (phase === "results" && attemptRef.current) {
    const attempt = getAttempt(attemptRef.current.attemptId) ?? attemptRef.current;
    return <Results attempt={attempt} questions={questions} meta={meta} />;
  }

  const g = graded[q.id] ?? null;
  const last = index === questions.length - 1;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <span className="eyebrow">{meta.examCode} - {mode}</span>
        <Timer
          initialElapsedSec={0}
          countdownSec={null}
          onTick={handleTick}
          onExpire={finish}
          onPause={handlePause}
        />
      </div>
      {/* Contract C2 (Task 9 review): QuestionCard renders in a bare div - never inside .card
          (its .qnum text fails AA contrast on a --panel-background surface). */}
      <QuestionCard question={q} graded={g} onSubmit={submit} index={index} total={questions.length} />
      {g && (
        <button className="btn btn-primary" onClick={() => (last ? finish() : setIndex((i) => i + 1))}>
          {last ? "See results" : "Next question"}
        </button>
      )}
    </div>
  );
}
