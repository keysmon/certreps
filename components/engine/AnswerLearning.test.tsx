import {it,expect} from "vitest";
import {render,screen,within} from "@testing-library/react";
import {getCert} from "@/lib/certs";
import {getAnswerNote} from "@/lib/learning";
import {optionPermutation} from "@/lib/permute";
import notes from "@/content/aip-c01/answer-notes.json";
import {QuestionCard} from "./QuestionCard";
import {AnswerLearning} from "./AnswerLearning";
const q=getCert("aip-c01")!.bank.find(q=>q.id===Object.keys(notes)[0])!;
it("keeps learning and rationales sealed before grading and exposes a new-tab lesson after grading",()=>{
 const props={question:q,certId:"aip-c01",vendorSlug:"aws",attemptId:"learning-test",vendorName:"AWS",onSubmit:()=>{}};
 const {rerender}=render(<QuestionCard {...props} graded={null}/>);
 expect(screen.queryByRole("link",{name:/related lesson/})).not.toBeInTheDocument();expect(screen.queryByText(/Why each option/)).not.toBeInTheDocument();
 rerender(<QuestionCard {...props} graded={{chosen:q.correct,correct:true}}/>);
 expect(screen.getByRole("link",{name:/related lesson/})).toHaveAttribute("target","_blank");expect(screen.getByText(/Why each option/)).toBeInTheDocument();
});
it("keeps rationales aligned with shuffled canonical options",()=>{
 render(<AnswerLearning question={q} certId="aip-c01" vendorSlug="aws" attemptId="shuffle-learning" chosen={[]}/>);
 const items=screen.getAllByRole("listitem",{hidden:true});const perm=optionPermutation("shuffle-learning",q.id,q.options.length);const note=getAnswerNote("aip-c01",q.id)!;
 perm.forEach((ci,vi)=>{expect(items[vi]).toHaveTextContent(`${String.fromCharCode(65+vi)}. ${q.options[ci]}`);expect(within(items[vi]).getByText(note.options[ci],{exact:false})).toBeInTheDocument();});
});
