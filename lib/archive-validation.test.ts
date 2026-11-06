import { execFileSync } from "node:child_process";
import { expect, it } from "vitest";
function validate(items:object[]){
 const script="import sys,json;sys.path.insert(0,'pipeline');from validate_bank import validate_supersessions;print(json.dumps(validate_supersessions(json.loads(sys.argv[1]))))";
 return JSON.parse(execFileSync("python3",["-c",script,JSON.stringify(items)],{encoding:"utf8"}));
}
const old={id:"a",domain:"D",excludedFromPractice:true,supersededBy:"b"};
it("preserves archival replacement links when their successors are later retired",()=>{
 expect(validate([old,{id:"b",domain:"D",excludedFromPractice:true,exclusionReason:"Later review"}])).toEqual([]);
 expect(validate([old,{id:"b",domain:"D",excludedFromPractice:true,supersededBy:"c"},{id:"c",domain:"D"}])).toEqual([]);
});
it("still rejects missing targets, domain changes, active predecessors and cycles",()=>{
 expect(validate([old])).not.toEqual([]);
 expect(validate([old,{id:"b",domain:"other"}])).not.toEqual([]);
 expect(validate([{...old,excludedFromPractice:false},{id:"b",domain:"D"}])).not.toEqual([]);
 expect(validate([old,{id:"b",domain:"D",excludedFromPractice:true,supersededBy:"a"}])).not.toEqual([]);
});
