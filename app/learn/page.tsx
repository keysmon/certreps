import Link from "next/link";
import { TopNav } from "@/components/ui/TopNav";
import { listCerts } from "@/lib/certs";
import { getCurriculum } from "@/lib/learning";
import { certPath } from "@/lib/routes";
export const metadata = {title: "Learn", description: "Optional certification curricula, lessons and guided exercises."};
export default function LearnPage() {
 return <><TopNav /><main className="container learning-page" id="maincontent"><p className="eyebrow">Study library</p><h1>Learn at your pace.</h1><p className="learning-intro">Explore what each certification covers, read a lesson, or go straight to practice. Nothing here is required to start a test.</p><div className="learning-grid">{listCerts().map(meta => {const course = getCurriculum(meta.certId);return <article className="learning-panel" key={meta.certId}><p className="eyebrow">{meta.examCode}</p><h2>{meta.title}</h2><p>{course?.overview}</p><p className="learning-muted">{meta.domains.length} domain outlines{meta.certId === "aip-c01" ? " + 5 detailed lessons and rapid review" : " + a study guide"}</p><Link className="btn btn-ghost" href={`${certPath(meta)}/learn`}>Explore curriculum</Link></article>;})}</div></main></>;
}
