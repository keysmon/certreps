import type { Question } from "@/lib/types";
import { getAnswerNote, lessonForQuestion } from "@/lib/learning";
import { optionPermutation } from "@/lib/permute";
/** Render only after grading: timed mock callers keep this sealed until results. */
export function AnswerLearning({question, certId, vendorSlug, attemptId, chosen, className, showCorrect = true}: {question:Question; certId?:string; vendorSlug?:string; attemptId:string; chosen:number[]; className?:string; showCorrect?:boolean}) {
 const candidate=getAnswerNote(certId,question.id);
 const note=candidate?.options.length===question.options.length ? candidate : undefined;
 const lesson=certId && vendorSlug ? lessonForQuestion(certId,vendorSlug,question) : undefined;
 const perm=optionPermutation(attemptId,question.id,question.options.length);
 return <div className="answer-learning">
 {showCorrect && <p className="answer-key"><strong>Correct answer{question.correct.length>1 ? "s" : ""}:</strong> {perm.filter(ci=>question.correct.includes(ci)).map(ci=>question.options[ci]).join("; ")}</p>}
 <p className={className} dangerouslySetInnerHTML={{__html:question.explanation}} />
 {note && <><p><strong>Remember:</strong> {note.takeaway}</p>{chosen.filter(ci=>!question.correct.includes(ci)).map(ci=><p key={ci}><strong>Your choice: {question.options[ci]}</strong><br />{note.options[ci]}</p>)}<details><summary>Why each option fits or falls short</summary><ol style={{listStyle:"none",paddingLeft:0}}>{perm.map((ci,vi)=><li key={ci}><strong>{String.fromCharCode(65+vi)}. {question.options[ci]}</strong> {question.correct.includes(ci) ? "(Correct)" : ""}<br />{note.options[ci]}</li>)}</ol></details></>}
 {lesson && <a className="lesson-link" href={lesson.href} target="_blank" rel="noopener noreferrer">{lesson.label} (opens new tab)</a>}
 </div>;
}
