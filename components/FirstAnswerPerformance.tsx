"use client";
import {useEffect, useState} from "react";
import type {Attempt, CertMeta} from "@/lib/types";
import {firstAnswerPerformance} from "@/lib/first-answers";
import {listAttempts} from "@/lib/storage";
import {getCert} from "@/lib/certs";
import {useAttemptRevision} from "@/lib/useAttemptRevision";

export function FirstAnswerPerformance({meta, attempt}: {meta: CertMeta; attempt?: Attempt}) {
  const revision = useAttemptRevision();
  const [performance, setPerformance] = useState<ReturnType<typeof firstAnswerPerformance> | null>(null);
  useEffect(() => {
    const history = listAttempts(meta.certId).filter(item => item.attemptId !== attempt?.attemptId);
    if (attempt) history.push(attempt);
    setPerformance(firstAnswerPerformance(history, getCert(meta.certId)?.bank ?? [], meta.certId, attempt?.attemptId));
  }, [meta.certId, attempt, revision]);
  return <section className="first-performance" aria-label="First-answer performance">
    <h3>First-answer performance</h3>
    <p className="learning-muted">Your earliest scored answer to each active question in saved history. Retakes do not overwrite that result. Separate from mock scores.</p>
    {!performance ? <p>Loading saved history...</p> : performance.total === 0 ? <p>No scored first answers yet.</p> : <>
      <p className="first-score" data-testid="first-answer-score"><strong>{performance.correct} / {performance.total}</strong> first answers correct <span>{performance.pct}%</span></p>
      {performance.session && <p>Fresh in this session: {performance.session.correct} / {performance.session.total} correct. {performance.session.repeated} previously scored {performance.session.repeated === 1 ? "question" : "questions"} answered again.</p>}
      <details><summary>Domain breakdown and how this is counted</summary><ul>{meta.domains.filter(domain => performance.byDomain[domain.name]).map(domain => { const row = performance.byDomain[domain.name]; return <li key={domain.name}><span>{domain.name}</span><strong>{row.correct} / {row.total}</strong></li>; })}</ul><p className="learning-muted">Counts answered questions only, across practice and submitted timed mocks. Unfinished timed mocks, unanswered items and excluded questions do not count. This sample is study feedback, not a prediction of an official exam result.</p>{performance.estimatedCount > 0 && <p className="learning-muted">{performance.estimatedCount} first answers use older history without answer timestamps. Those sessions are ordered by session start, so their answer order is approximate.</p>}<p className="learning-muted">Based on the saved history available on this device. Synced history contributes after it loads; deleting history can change this baseline.</p></details>
    </>}
  </section>;
}
