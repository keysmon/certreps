import {it,expect} from "vitest";
import {render,screen,waitFor} from "@testing-library/react";
import {FirstAnswerPerformance} from "./FirstAnswerPerformance";
import {getCert} from "@/lib/certs";
import {writeAll} from "@/lib/storage";
import type {Attempt} from "@/lib/types";
const {meta,bank}=getCert("aip-c01")!;const q=bank.find(q=>!q.excludedFromPractice)!;
function attempt(id:string,correct:boolean,at:number):Attempt{return {attemptId:id,certId:meta.certId,mode:"quick",questionIds:[q.id],results:{[q.id]:{questionId:q.id,chosen:[0],correct,flagged:false,answeredAt:at}},startedAt:at,finishedAt:at+1,elapsedSec:1,pauseCount:0};}
it("shows an honest empty state and updates when saved history changes without overwriting first performance",async()=>{
 writeAll([]);render(<FirstAnswerPerformance meta={meta}/>);expect(await screen.findByText("No scored first answers yet.")).toBeInTheDocument();
 writeAll([attempt("first",false,100),attempt("retry",true,200)]);
 await waitFor(()=>expect(screen.getByTestId("first-answer-score")).toHaveTextContent("0 / 1"));expect(screen.getByTestId("first-answer-score")).toHaveTextContent("0%");
});
it("can include the just-finished result snapshot when persistent storage has not supplied it",async()=>{
 writeAll([]);render(<FirstAnswerPerformance meta={meta} attempt={attempt("current",true,100)}/>);
 expect(await screen.findByTestId("first-answer-score")).toHaveTextContent("1 / 1");expect(screen.getByText(/Fresh in this session/)).toHaveTextContent("1 / 1");
});
