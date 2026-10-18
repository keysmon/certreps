"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { WorkspaceNav } from "@/components/ui/WorkspaceNav";
import type { Incident } from "@/lib/incidents";

export function IncidentRunner({incident}: {incident: Incident}) {
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const heading = useRef<HTMLHeadingElement>(null);
  const started = useRef(false);
  const feedback = useRef<HTMLDivElement>(null);
  const done = index === incident.steps.length;
  const step = incident.steps[index];
  const checked = answers.length > index;
  const correctCount = answers.filter((answer, i) => answer === incident.steps[i].correct).length;
  useEffect(() => {
    if (started.current) {
      heading.current?.focus({preventScroll: true});
      heading.current?.scrollIntoView?.({block: "start"});
    }
    started.current = true;
  }, [index]);
  useEffect(() => { if (checked) feedback.current?.scrollIntoView?.({block: "nearest"}); }, [checked]);
  function next() { setChosen(null); setIndex(i => i + 1); }
  function replay() { setAnswers([]); setChosen(null); setIndex(0); }
  return <div className="incident-stage">
    <header className="incident-toolbar"><span>Case / {done ? "Debrief" : `${index + 1} of ${incident.steps.length}`}</span><Link href="/aws/aip-c01/incidents">Exit case</Link><WorkspaceNav practice /></header>
    <main className="container incident-main" id="maincontent">
      <p className="eyebrow">AIP-C01 / Incident challenge</p>
      <h1>{incident.title}</h1>
      <p className="learning-muted">{incident.domain}</p>
      <p>{incident.summary}</p>
      <p className="learning-muted">Fictional evidence for learning. Case progress stays in this page while it is open. Separate from exam scores and saved attempts.</p>
      {done ? <section className="learning-panel incident-debrief">
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
            setChosen(nextChoice);
            event.currentTarget.querySelectorAll<HTMLButtonElement>("[role=radio]")[nextChoice]?.focus();
          }}>{step.options.map((option, i) => <button key={`${step.id}-${i}`} type="button" role="radio" aria-checked={chosen === i} disabled={checked} tabIndex={checked ? -1 : chosen === null ? (i === 0 ? 0 : -1) : (chosen === i ? 0 : -1)} className={`incident-option${chosen === i ? " selected" : ""}${checked && i === step.correct ? " correct" : ""}${checked && chosen === i && i !== step.correct ? " incorrect" : ""}`} onClick={() => setChosen(i)}><span aria-hidden="true">{String.fromCharCode(65 + i)}</span><span>{option}</span></button>)}</div>
          {checked && chosen !== null && <div ref={feedback} className="incident-feedback learning-panel" role="status"><h3>{chosen === step.correct ? "Correct decision." : "Review this decision."}</h3><p>{step.explanations[chosen]}</p>{chosen !== step.correct && <><p><strong>Best choice:</strong> {step.options[step.correct]}</p><p>{step.explanations[step.correct]}</p></>}</div>}
        </section>
        <div className="incident-actions"><span>{checked ? "Decision reviewed" : "Choose one answer"}</span>{checked ? <button type="button" className="btn btn-primary" onClick={next}>{index === incident.steps.length - 1 ? "View debrief" : "Next checkpoint"}</button> : <button type="button" className="btn btn-primary" disabled={chosen === null} onClick={() => { if (chosen !== null) setAnswers(a => [...a, chosen]); }}>Check answer</button>}</div>
      </>}
    </main>
  </div>;
}
