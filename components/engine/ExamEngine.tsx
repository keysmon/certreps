"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Attempt, Mode, Question } from "@/lib/types";
import { getBank, getMeta } from "@/lib/bank";
import { sampleDrill, sampleMock, sampleQuick, questionsByIds } from "@/lib/sampler";
import { createAttempt, saveAttempt, recordResult, finishAttempt, missedQuestionIds, getAttempt, saveProgress } from "@/lib/storage";
import { isCorrect } from "@/lib/scoring";
import { QuestionCard } from "./QuestionCard";
import { Timer } from "./Timer";
import { Results } from "./Results";
import { ReviewMap } from "./ReviewMap";
import { VendorDot, VENDORS } from "@/components/ui/VendorDot";
import "./engine.css";

const QUICK_N = 10;
const DRILL_N = 12;
const PROGRESS_PERSIST_MS = 10_000;
// Design glyphs via fromCharCode (repo ASCII-source convention, matches QuestionCard/OptionRow).
const MIDDOT = String.fromCharCode(183); // U+00B7 middle dot - mode-note separator
const TIMES = String.fromCharCode(10005); // U+2715 multiplication x - exit affordance

export function ExamEngine({ certId, mode, domain, resumeAttemptId }: { certId?: string; mode: Mode; domain?: string; resumeAttemptId?: string }) {
  const bank = getBank(certId);
  const meta = getMeta(certId);
  const isMock = mode === "mock";

  // Resume target resolved once per mount: a STORED, UNFINISHED attempt whose mode matches this
  // engine. Anything else (no id / missing / already finished / mode mismatch) yields null and the
  // engine silently takes the normal fresh-sample path - no error UI (see Task 8).
  const resumed: Attempt | null = useMemo(() => {
    if (!resumeAttemptId) return null;
    const a = getAttempt(resumeAttemptId);
    if (!a || a.finishedAt !== null || a.mode !== mode) return null;
    return a;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const questions: Question[] = useMemo(() => {
    // Resume reuses the STORED question order verbatim (never resamples).
    if (resumed) return questionsByIds(bank, resumed.questionIds);
    if (mode === "quick") return sampleQuick(bank, QUICK_N);
    if (mode === "drill" && domain) return sampleDrill(bank, domain, DRILL_N);
    if (mode === "retry") return questionsByIds(bank, missedQuestionIds(meta.certId));
    if (mode === "mock") return sampleMock(bank, meta);
    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Sampled once per mount; callers must key ExamEngine by mode+domain+resume (see PracticeClient,
  // Task 15) - prop changes without remount are ignored.

  // Contract C1 (Task 5 review): saveAttempt exactly once here; recordResult/finishAttempt thereafter.
  // NEVER re-save the engine-held copy - it would clobber recorded results.
  // Lazy-ref init (React docs "avoiding recreating the ref contents"): a useRef(IIFE()) initializer
  // is RE-EVALUATED every render, which fired saveAttempt on each render (21x in the loop) and
  // violated C1; the null-guard runs createAttempt/saveAttempt exactly once on the first render.
  // Resume ADOPTS the stored attempt as-is: no createAttempt (that mints a second attemptId / row)
  // and no saveAttempt (the row already exists) - recordResult/finishAttempt keep upserting the
  // SAME id, so the write-once contract holds and no duplicate attempt is ever created.
  const attemptRef = useRef<Attempt | null>(null);
  if (attemptRef.current === null && questions.length) {
    if (resumed) {
      attemptRef.current = resumed;
    } else {
      const a = createAttempt(meta.certId, mode, questions.map((qq) => qq.id), domain);
      saveAttempt(a);
      attemptRef.current = a;
    }
  }

  // Seed the write-through UI journal from the resumed attempt's results (once per mount). Practice
  // modes hydrate `graded` (chosen + correctness -> an already-answered question shows its graded
  // state, not a fresh form); mock hydrates `answers` (silent chosen). Flags restore for both modes.
  const seed = useMemo(() => {
    const graded: Record<string, { chosen: number[]; correct: boolean }> = {};
    const answers: Record<string, number[]> = {};
    const flags: Record<string, boolean> = {};
    if (resumed) {
      for (const r of Object.values(resumed.results)) {
        if (isMock) answers[r.questionId] = r.chosen;
        else graded[r.questionId] = { chosen: r.chosen, correct: r.correct };
        if (r.flagged) flags[r.questionId] = true;
      }
    }
    return { graded, answers, flags };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resume position: the first UNANSWERED question (or index 0 when every question is answered).
  const initialIndex = useMemo(() => {
    if (!resumed) return 0;
    const i = questions.findIndex((qq) => !resumed.results[qq.id]);
    return i === -1 ? 0 : i;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [index, setIndex] = useState(initialIndex);
  const [phase, setPhase] = useState<"question" | "review" | "results">("question");
  // In-memory UI projection of attempt.results (write-through journal), seeded from the resumed
  // attempt above - do not read storage during render.
  const [graded, setGraded] = useState<Record<string, { chosen: number[]; correct: boolean }>>(seed.graded);
  const [answers, setAnswers] = useState<Record<string, number[]>>(seed.answers); // mock: chosen without reveal
  const [flags, setFlags] = useState<Record<string, boolean>>(seed.flags);
  // Resume continues the stored clock + pause tally so a post-resume finish accumulates rather than
  // clobbering them (initialElapsedSec below keeps the mock countdown honest).
  const elapsedRef = useRef(resumed ? resumed.elapsedSec : 0);
  const pausesRef = useRef(resumed ? resumed.pauseCount : 0);
  // Contract C1b (Task 13 review): finish is one-way. Once submitted (or the countdown expires),
  // every nav/jump/flag/submit handler no-ops so a queued setPhase("question") cannot reopen a
  // sealed exam after onExpire has already moved it to results.
  const finishedRef = useRef(false);

  const q = questions[index];

  // Contract C3 (Task 10 review): memoize every Timer handler - inline arrows would reset the
  // Timer interval each render and drop partial seconds.
  const handleTick = useCallback((e: number) => { elapsedRef.current = e; }, []);
  const handlePause = useCallback(() => { pausesRef.current += 1; }, []);

  // Practice: grade immediately. Mock: record silently.
  const submit = useCallback(
    (chosen: number[]) => {
      if (finishedRef.current || !q || !attemptRef.current) return;
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
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (attemptRef.current) finishAttempt(attemptRef.current.attemptId, elapsedRef.current, pausesRef.current);
    setPhase("results");
  }, []);

  // One guarded entry point for Prev/Next/jump so the C1b no-op lives in a single place.
  const goTo = useCallback((i: number) => {
    if (finishedRef.current) return;
    setIndex(i);
    setPhase("question");
  }, []);

  const toggleFlag = useCallback(() => {
    if (finishedRef.current || !q || !attemptRef.current) return;
    const next = !flags[q.id];
    setFlags((f) => ({ ...f, [q.id]: next }));
    const chosen = answers[q.id];
    if (chosen) {
      recordResult(attemptRef.current.attemptId, {
        questionId: q.id, chosen, correct: isCorrect(chosen, q.correct), flagged: next,
      });
    }
  }, [q, flags, answers]);

  // Persist the running clock every 10s and once more on unmount, so navigating away mid-exam and
  // resuming continues from an honest elapsed time - not a near-full countdown. saveProgress writes
  // localStorage only and no-ops on a sealed attempt, so this never races or clobbers the finish
  // write. Refs only, so the effect binds once (empty deps).
  useEffect(() => {
    const persist = () => {
      if (attemptRef.current && !finishedRef.current) {
        saveProgress(attemptRef.current.attemptId, elapsedRef.current, pausesRef.current);
      }
    };
    const id = setInterval(persist, PROGRESS_PERSIST_MS);
    return () => {
      clearInterval(id);
      persist();
    };
  }, []);

  if (questions.length === 0) {
    return (
      <div className="stage">
        <div className="card">
          <p>{mode === "retry" ? "No missed questions yet - take a practice run first." : "No questions available."}</p>
          <a className="btn btn-ghost" href={`/aws/${meta.certId}`}>Back to {meta.examCode}</a>
        </div>
      </div>
    );
  }

  if (phase === "results" && attemptRef.current) {
    const attempt = getAttempt(attemptRef.current.attemptId) ?? attemptRef.current;
    // Results early-returns before the exam bar + stage, so it needs its own width clamp now that
    // page.tsx no longer wraps the surface in .container. Task 7 re-widths this to the design's 940px.
    return (
      <div className="stage">
        <Results attempt={attempt} questions={questions} meta={meta} />
      </div>
    );
  }

  const g = isMock ? null : graded[q.id] ?? null;
  const last = index === questions.length - 1;
  const answeredThis = isMock && !!answers[q.id];

  // Streak (drill/quick only, Task 6): consecutive-correct over the in-order answered prefix. A pure
  // render derivation from `graded` - it adds no state and never writes storage, so engine logic is
  // untouched. It is 0 on a fresh mount (empty `graded`), honestly reflects a resumed practice run's
  // restored answers, and stays 0 in mock (mock records into `answers`, never grading `graded`).
  let streak = 0;
  if (!isMock) {
    for (const qq of questions) {
      const res = graded[qq.id];
      if (!res) break;
      streak = res.correct ? streak + 1 : 0;
    }
  }
  const vendorColor = VENDORS[meta.vendor.toLowerCase()]?.c ?? "var(--gold)";
  // Honest mode descriptions (design idiom) - the mock note names the blueprint bias + late reveal.
  const modeNote = isMock
    ? `Mock exam ${MIDDOT} mix follows the exam blueprint ${MIDDOT} explanations at the end`
    : mode === "drill"
    ? `Domain drill ${MIDDOT} instant feedback`
    : mode === "retry"
    ? `Retry missed ${MIDDOT} instant feedback`
    : `Quick drill ${MIDDOT} instant feedback`;

  // Contract C1a (Task 13 review): the exam bar (switcher + progress + Timer) is hoisted above the
  // phase switch so the sealed countdown NEVER unmounts between the question and review phases - it
  // only unmounts when finish() moves to results. initialElapsedSec seeds from elapsedRef so any
  // remount resumes in place. The Timer stays mounted (and ticking) in practice too - it is only
  // visually hidden there (the design shows the clock for mock only), so practice elapsed still records.
  return (
    <>
      <div className="exambar">
        <div className="switcher">
          <VendorDot color={vendorColor} />
          <span className="sc-name">{meta.title}</span>
        </div>
        <div className="pbar-wrap">
          <span className="pcount">{index + 1}/{questions.length}</span>
          <div className="pbar"><span style={{ width: `${(index / questions.length) * 100}%` }} /></div>
        </div>
        <span style={{ display: isMock ? "inline-flex" : "none" }}>
          <Timer
            initialElapsedSec={elapsedRef.current}
            countdownSec={isMock ? meta.mockMinutes * 60 : null}
            onTick={handleTick}
            onExpire={finish}
            onPause={handlePause}
          />
        </span>
        <a className="exit" href={`/aws/${meta.certId}`}>Exit {TIMES}</a>
      </div>

      <div className="stage">
        {phase === "review" ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
              <h2 className="review-head">Review your answers</h2>
              {/* Contract C7 (Task 11 review): the Submit button precedes the map in DOM order so
                  keyboard users are not forced to tab through 65 cells to reach it. */}
              <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={finish}>Submit exam</button>
            </div>
            <div data-testid="reviewmap" className="review-panel">
              <ReviewMap
                states={questions.map((qq) => ({ answered: !!answers[qq.id], flagged: !!flags[qq.id] }))}
                current={index}
                onJump={goTo}
              />
            </div>
          </div>
        ) : (
          <div>
            <p className="mode-note">{modeNote}</p>
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
              <div className="mocknav">
                <button className="btn btn-ghost btn-sm" onClick={toggleFlag}>
                  {flags[q.id] ? "Unflag" : "Flag for review"}
                </button>
                <button className="btn btn-ghost btn-sm" disabled={index === 0} onClick={() => goTo(index - 1)}>Prev</button>
                <button className="btn btn-ghost btn-sm" disabled={last} onClick={() => goTo(index + 1)}>Next</button>
                {answers[q.id] && <span className="recorded">Answer recorded</span>}
                <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={() => { if (!finishedRef.current) setPhase("review"); }}>
                  Review & submit
                </button>
              </div>
            )}

            {!isMock && g && (
              <div className="footbar">
                {streak > 0 && <span className="streak">Streak: <b>{streak} correct</b></span>}
                <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={() => (last ? finish() : setIndex((i) => i + 1))}>
                  {last ? "See results" : "Next question"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
