import { beforeEach, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExamEngine } from "./ExamEngine";
import { getBank, getMeta, getPracticeBank } from "@/lib/bank";
import { createAttempt, saveAttempt, listAttempts } from "@/lib/storage";
import { samplePrep } from "@/lib/prep";
beforeEach(()=>localStorage.clear());
it("launches a 20-question Challenge set and restores its identity through a plain resume URL",()=>{
 const view=render(<ExamEngine certId="aip-c01" mode="quick" level="hard"/>);
 expect(screen.getByRole("heading",{name:"Challenge prep."})).toBeInTheDocument();
 const a=listAttempts("aip-c01")[0];expect(a.questionIds).toHaveLength(20);
 expect(a.questionIds.every(id=>getBank().find(q=>q.id===id)?.difficulty==="hard")).toBe(true);
 view.unmount();render(<ExamEngine certId="aip-c01" mode="quick" resumeAttemptId={a.attemptId}/>);
 expect(screen.getByRole("heading",{name:"Challenge prep."})).toBeInTheDocument();
 expect(listAttempts("aip-c01")).toHaveLength(1);
});
it("refuses a Challenge link to a saved Standard set without changing the saved answers",()=>{
 const ids=samplePrep(getPracticeBank(),"medium",getMeta()).map(q=>q.id);
 const a=createAttempt("aip-c01","quick",ids);saveAttempt(a);
 render(<ExamEngine certId="aip-c01" mode="quick" level="hard" resumeAttemptId={a.attemptId}/>);
 expect(screen.getByText("This link does not match the saved session")).toBeInTheDocument();
 expect(listAttempts("aip-c01")).toEqual([a]);
 expect(screen.getByRole("link",{name:"Start fresh practice"})).toHaveAttribute("href","/aws/aip-c01/practice?mode=quick&level=hard");
});
