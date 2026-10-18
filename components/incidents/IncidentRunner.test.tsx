import {it,expect} from "vitest";
import {render,screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {IncidentRunner} from "./IncidentRunner";
import type {Incident} from "@/lib/incidents";
import {readAll} from "@/lib/storage";
const incident:Incident={id:"case-one",title:"A duplicate operation",domain:"Implementation & Integration",summary:"Synthetic case.",minutes:5,evidence:[{label:"Trace",body:"request=abc\nrefunds=2"}],steps:[{id:"cause",prompt:"What caused it?",options:["A retry without deduplication","A cache hit"],correct:0,explanations:["The same operation was executed twice.","A cache hit does not execute a second refund."]},{id:"fix",prompt:"Choose a fix",options:["Increase timeout","Deduplicate the operation"],correct:1,explanations:["Timeouts alone do not prevent duplicate execution.","Use a durable key for the business operation."]},{id:"verify",prompt:"How to verify?",options:["Inject a timeout and retry","Only test successful requests"],correct:0,explanations:["Check that only one refund is committed.","That misses the failed response path."]}],debrief:"Retries require idempotent side effects.",sources:[{label:"Docs",url:"https://docs.aws.amazon.com/"}],reviewedOn:"2026-10-18"};
it("locks graded checkpoints, explains choices, completes and replays without exam attempt writes",async()=>{
 const before=readAll();const user=userEvent.setup();render(<IncidentRunner incident={incident}/>);
 const check=screen.getByRole("button",{name:"Check answer"});expect(check).toBeDisabled();
 await user.click(screen.getByRole("radio",{name:/A cache hit/}));await user.click(check);
 expect(screen.getByRole("status")).toHaveTextContent("A cache hit does not execute a second refund.");expect(screen.getByRole("radio",{name:/A cache hit/})).toBeDisabled();
 await user.click(screen.getByRole("button",{name:"Next checkpoint"}));expect(screen.getByRole("heading",{name:"Choose a fix"})).toHaveFocus();
 await user.click(screen.getByRole("radio",{name:/Deduplicate/}));await user.click(screen.getByRole("button",{name:"Check answer"}));await user.click(screen.getByRole("button",{name:"Next checkpoint"}));
 await user.click(screen.getByRole("radio",{name:/Inject a timeout/}));await user.click(screen.getByRole("button",{name:"Check answer"}));await user.click(screen.getByRole("button",{name:"View debrief"}));
 expect(screen.getByRole("heading",{name:"Case complete."})).toHaveFocus();expect(screen.getByText("2 / 3 checkpoints correct")).toBeInTheDocument();expect(readAll()).toEqual(before);
 await user.click(screen.getByRole("button",{name:"Replay this case"}));expect(screen.getByRole("button",{name:"Check answer"})).toBeDisabled();expect(readAll()).toEqual(before);
});
