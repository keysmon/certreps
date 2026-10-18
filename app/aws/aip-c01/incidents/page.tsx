import Link from "next/link";
import {TopNav} from "@/components/ui/TopNav";
import {IncidentLibrary} from "@/components/incidents/IncidentLibrary";
import {listIncidents} from "@/lib/incidents";
export const metadata = {title: "AIP-C01 incident challenges", description: "Optional hands-on reasoning cases with fictional evidence, reviewed explanations and official sources."};
export default function IncidentsPage() {
  return <><TopNav/><main className="container learning-page" id="maincontent"><nav className="learning-actions" aria-label="Breadcrumb"><Link href="/aws/aip-c01">AIP-C01 practice</Link><Link href="/aws/aip-c01/learn">Curriculum</Link></nav><p className="eyebrow">AIP-C01 / Optional exercises</p><h1>Investigate an incident.</h1><p className="learning-intro">Read the evidence, diagnose the cause, choose a fix, and decide how to verify it. Pick any case.</p><p>Five fictional cases, one per exam domain. No AWS account or cloud resources needed. Incident results stay separate from exam scores and saved attempts.</p><IncidentLibrary incidents={listIncidents()}/><div className="learning-actions"><Link href="/aws/aip-c01/practice?mode=quick">Go straight to question practice</Link></div></main></>;
}
