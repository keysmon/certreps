"use client";
import { useCallback, useEffect, useRef, useState } from "react";
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

  // Deferred session init (Task 10 hydration must-fix): sampling (Math.random via the lib samplers)
  // and the resume storage reads run in the init effect below, NOT during render. This client
  // component is prerendered, so sampling at render time baked a server-time question set into the
  // static HTML that the client then re-sampled - a hydration mismatch (browser-confirmed: server
  // "Domain 5" vs client "Domain 2") and a wrong-question flash on every practice load. Until the
  // effect runs, `ready` is false and we render the loading shell, so the server HTML and the first
  // client render agree and only the client ever samples. Mirrors the CatalogClient/CertDetailClient
  // idiom (SSR the zero-state default, hydrate from localStorage in an effect).
  const [ready, setReady] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"question" | "review" | "results">("question");
  // In-memory UI projection of attempt.results (write-through journal), seeded from a resumed attempt
  // by the init effect - do not read storage during render.
  const [graded, setGraded] = useState<Record<string, { chosen: number[]; correct: boolean }>>({});
  const [answers, setAnswers] = useState<Record<string, number[]>>({}); // mock: chosen without reveal
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  // Resume continues the stored clock + pause tally so a post-resume finish accumulates rather than
  // clobbering them. The init effect seeds these from the resumed attempt BEFORE flipping `ready`, so
  // the Timer mounts with the restored elapsed (never the full budget) - initialElapsedSec reads them.
  const elapsedRef = useRef(0);
  const pausesRef = useRef(0);
  // Contract C1b (Task 13 review): finish is one-way. Once submitted (or the countdown expires),
  // every nav/jump/flag/submit handler no-ops so a queued setPhase("question") cannot reopen a
  // sealed exam after onExpire has already moved it to results.
  const finishedRef = useRef(false);
  // Contract C1 (Task 5 review): the adopted/created attempt. saveAttempt happens exactly once (in
  // the init effect); recordResult/finishAttempt upsert the SAME id thereafter. NEVER re-save the
  // engine-held copy - it would clobber recorded results.
  const attemptRef = useRef<Attempt | null>(null);
  // Guards the init effect to exactly-once even under React StrictMode's dev double-invoke of effects.
  // Without it the second invoke would mint a SECOND createAttempt row (a C1 violation + a phantom
  // unfinished attempt the dashboard would surface) - a dev-only bug RTL (no StrictMode) cannot catch.
  const initedRef = useRef(false);

  // Sample + adopt/create the attempt once on mount. Reproduces the OLD render-time path verbatim:
  // resume resolves a STORED, UNFINISHED, mode-matching attempt (else null -> fresh sample); resume
  // reuses the stored question order (never resamples) and ADOPTS the row as-is (no createAttempt -
  // that would mint a second id - and no saveAttempt - the row already exists); the fresh path samples
  // per mode and calls createAttempt + saveAttempt exactly once (C1). Then seeds the write-through
  // journal (graded/answers/flags), the clock, and the resume position from the resumed attempt, and
  // flips ready. Every setState here batches into a single re-render.
  useEffect(() => {
    if (initedRef.current) return;
    initedRef.current = true;

    const resumed: Attempt | null = (() => {
      if (!resumeAttemptId) return null;
      const a = getAttempt(resumeAttemptId);
      if (!a || a.finishedAt !== null || a.mode !== mode) return null;
      return a;
    })();

    const sampled: Question[] = resumed
      ? questionsByIds(bank, resumed.questionIds)
      : mode === "quick"
      ? sampleQuick(bank, QUICK_N)
      : mode === "drill" && domain
      ? sampleDrill(bank, domain, DRILL_N)
      : mode === "retry"
      ? questionsByIds(bank, missedQuestionIds(meta.certId))
      : mode === "mock"
      ? sampleMock(bank, meta)
      : [];

    if (sampled.length) {
      if (resumed) {
        attemptRef.current = resumed;
      } else {
        const a = createAttempt(meta.certId, mode, sampled.map((qq) => qq.id), domain);
        saveAttempt(a);
        attemptRef.current = a;
      }
    }

    if (resumed) {
      const graded0: Record<string, { chosen: number[]; correct: boolean }> = {};
      const answers0: Record<string, number[]> = {};
      const flags0: Record<string, boolean> = {};
      for (const r of Object.values(resumed.results)) {
        if (isMock) answers0[r.questionId] = r.chosen;
        else graded0[r.questionId] = { chosen: r.chosen, correct: r.correct };
        if (r.flagged) flags0[r.questionId] = true;
      }
      setGraded(graded0);
      setAnswers(answers0);
      setFlags(flags0);
      elapsedRef.current = resumed.elapsedSec;
      pausesRef.current = resumed.pauseCount;
      const i = sampled.findIndex((qq) => !resumed.results[qq.id]);
      setIndex(i === -1 ? 0 : i);
    }

    setQuestions(sampled);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Session not sampled yet (see the deferred-init note): render the loading shell. It matches the
  // page-level Suspense fallback so the static-HTML -> hydrated-shell transition is seamless, and it
  // MUST precede the questions-empty check below, or retry-with-no-missed would read as Loading forever.
  if (!ready) {
    return <p className="stage">Loading...</p>;
  }

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
  // Seeds QuestionCard's attempt-stable option shuffle. attemptRef.current is set by the init effect
  // whenever questions were sampled, so it is non-null on every path that reaches this render (the
  // questions-empty guard above returns otherwise); the ?? "" is a dead fallback kept only so the
  // prop stays a plain string.
  const attemptId = attemptRef.current?.attemptId ?? "";
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
              attemptId={attemptId}
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
