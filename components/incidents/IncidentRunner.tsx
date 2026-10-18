"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {useRouter} from "next/navigation";
import {useIncidentProgress} from "@/lib/useIncidentProgress";
import {validateIncidentRun} from "@/lib/incident-progress";
import { WorkspaceNav } from "@/components/ui/WorkspaceNav";
import type { Incident } from "@/lib/incidents";

export function IncidentRunner({incident}: {incident: Incident}) {
  const saved = useIncidentProgress(incident);
  const router = useRouter();
  const [exitFailed,setExitFailed] = useState(false);
  const run = saved.run && validateIncidentRun(saved.run,incident);
  const index = run?.cursor ?? 0;
  const answers = run ? Object.keys(run.answers).map(key=>run.answers[key]) : [];
  const chosen = run?.answers[String(index)] ?? run?.draft ?? null;
  const heading = useRef<HTMLHeadingElement>(null);
  const started = useRef(false);
  const feedback = useRef<HTMLDivElement>(null);
  const done = index === incident.steps.length;
  const step = incident.steps[index];
  const checked = !!run && Object.hasOwn(run.answers,String(index));
  const correctCount = answers.filter((answer, i) => answer === incident.steps[i].correct).length;
  useEffect(() => {
    if (started.current) {
      heading.current?.focus({preventScroll: true});
      heading.current?.scrollIntoView?.({block: "start"});
    }
    started.current = true;
  }, [index]);
  useEffect(() => { if (checked) feedback.current?.scrollIntoView?.({block: "nearest"}); }, [checked]);
  function select(choice:number) { if (run) void saved.save({...run,draft:choice}); }
  function next() { if (run) void saved.save({...run,cursor:index+1,draft:null}); }
  function replay() { void saved.replay(); }
  async function exit() { if (await saved.flush()) router.push("/aws/aip-c01/incidents"); else setExitFailed(true); }
  const saveLabel = saved.status === "loading" ? "Loading saved progress..." : saved.status === "saving" ? "Saving to account..." : saved.status === "synced" ? "Saved to your account" : saved.status === "device" ? "Saved on this device" : !saved.run ? "Progress unavailable" : saved.account ? (saved.deviceSaved ? "Saved on this device; account sync unavailable" : "Account sync unavailable") : "Device save unavailable";
  return <div className="incident-stage">
    <header className="incident-toolbar"><span>{done ? "Debrief" : `Step ${index + 1} / ${incident.steps.length}`}</span><button type="button" className="incident-exit" onClick={exit}>Save &amp; exit</button><WorkspaceNav practice /></header>
    <main className="container incident-main" id="maincontent">
      <p className="eyebrow">AIP-C01 / Incident challenge</p>
      <h1>{incident.title}</h1>
      <p className="learning-muted">{incident.domain}</p>
      <p>{incident.summary}</p>
      <p className="learning-muted">Fictional evidence for learning. Your choices and checkpoints save automatically. Incident results stay separate from exam scores.</p>
      <p className="incident-save-status" data-testid="incident-save-status" aria-live="polite">{saveLabel}{!saved.account && saved.status !== "loading" && <>. <Link href="/login">Sign in for account progress across devices</Link>. Guest and account cases are kept separately.</>}</p>
      {saved.message && <p className="learning-notice">{saved.message} <button type="button" className="btn btn-ghost btn-sm" onClick={saved.retry}>Retry sync</button></p>}
      {exitFailed && <p className="learning-notice">Your account save could not be confirmed. <Link href="/aws/aip-c01/incidents">Exit anyway</Link></p>}
      {!saved.run ? <section className="learning-panel"><h2>{saved.status === "loading" ? "Loading your case..." : "Reconnect to load your saved case"}</h2><p>On a new device, connect to your account before starting so an existing case is preserved.</p><button type="button" className="btn btn-ghost" onClick={saved.retry}>Retry loading</button><Link href="/aws/aip-c01/incidents">Back to cases</Link></section> : !run ? <section className="learning-panel"><h2>This case has changed</h2><p>Start its current version to use the updated evidence and checkpoints.</p><button type="button" className="btn btn-primary" onClick={replay}>Start current version</button></section> : done ? <section className="learning-panel incident-debrief">
        <h2 ref={heading} tabIndex={-1}>Case complete.</h2>
        <p className="incident-score">{correctCount} / {incident.steps.length} checkpoints correct</p>
        <p>{incident.debrief}</p>
        <h3>Your investigation</h3>
        <ol>{incident.steps.map((item, i) => <li key={item.id}><strong>{item.prompt}</strong><p>Your choice: {item.options[answers[i]]}</p>{answers[i] !== item.correct && <p>Best choice: {item.options[item.correct]}</p>}<p>{item.explanations[item.correct]}</p></li>)}</ol>
        <h3>Official references</h3>
        <ul>{incident.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.label} (opens new tab)</a></li>)}</ul>
        <p className="learning-muted">Content reviewed {incident.reviewedOn}. Fictional cases are not official exam questions.</p>
        <div className="learning-actions"><button type="button" className="btn btn-ghost" onClick={replay}>Replay this case</button><Link className="btn btn-primary" href="/aws/aip-c01/incidents">Choose another case</Link><Link href="/aws/aip-c01">Back to certification</Link></div>
      </section> : <>
        <section className="learning-panel incident-evidence" aria-label="Incident evidence"><h2>Evidence</h2>{incident.evidence.map(item => <div key={item.label}><h3>{item.label}</h3><pre tabIndex={0} aria-label={item.label}>{item.body}</pre></div>)}</section>
        <section className="incident-checkpoint" aria-label="Current checkpoint">
          <p className="eyebrow">Checkpoint {index + 1} / {incident.steps.length}</p>
          <h2 ref={heading} tabIndex={-1}>{step.prompt}</h2>
          <div role="radiogroup" aria-label="Investigation choices" className="incident-options" onKeyDown={event => {
            if (checked || !["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const direction = event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 1;
            const nextChoice = event.key === "Home" ? 0 : event.key === "End" ? step.options.length - 1 : ((chosen ?? (direction === 1 ? -1 : 0)) + direction + step.options.length) % step.options.length;
            select(nextChoice);
            event.currentTarget.querySelectorAll<HTMLButtonElement>("[role=radio]")[nextChoice]?.focus();
          }}>{step.options.map((option, i) => <button key={`${step.id}-${i}`} type="button" role="radio" aria-checked={chosen === i} disabled={checked} tabIndex={checked ? -1 : chosen === null ? (i === 0 ? 0 : -1) : (chosen === i ? 0 : -1)} className={`incident-option${chosen === i ? " selected" : ""}${checked && i === step.correct ? " correct" : ""}${checked && chosen === i && i !== step.correct ? " incorrect" : ""}`} onClick={() => select(i)}><span aria-hidden="true">{String.fromCharCode(65 + i)}</span><span>{option}</span></button>)}</div>
          {checked && chosen !== null && <div ref={feedback} className="incident-feedback learning-panel" role="status"><h3>{chosen === step.correct ? "Correct decision." : "Review this decision."}</h3><p>{step.explanations[chosen]}</p>{chosen !== step.correct && <><p><strong>Best choice:</strong> {step.options[step.correct]}</p><p>{step.explanations[step.correct]}</p></>}</div>}
        </section>
        <div className="incident-actions"><span>{checked ? "Decision reviewed" : "Choose one answer"}</span>{checked ? <button type="button" className="btn btn-primary" onClick={next}>{index === incident.steps.length - 1 ? "View debrief" : "Next checkpoint"}</button> : <button type="button" className="btn btn-primary" disabled={chosen === null} onClick={() => { if (chosen !== null && run) void saved.save({...run,answers:{...run.answers,[String(index)]:chosen},draft:null}); }}>Check answer</button>}</div>
      </>}
    </main>
  </div>;
}
