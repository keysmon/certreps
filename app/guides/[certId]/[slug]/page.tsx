import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { TopNav } from "@/components/ui/TopNav";
import { certPath, practicePath } from "@/lib/routes";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getCert, listCerts } from "@/lib/certs";
import { getGuide, guideTitle, listGuides } from "@/lib/guides";

export function generateStaticParams() {
  return listCerts().flatMap((c) => listGuides(c.certId).map((g) => ({ certId: c.certId, slug: g.slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ certId: string; slug: string }> }): Promise<Metadata> {
  const { certId, slug } = await params;
  const cert = getCert(certId);
  if (!cert) return {};
  const md = getGuide(certId, slug);
  const title = md ? guideTitle(md) : "Study guide";
  return { title, description: `${title} - free ${cert.meta.examCode} study guide with linked practice questions.` };
}

export default async function GuidePage({ params }: { params: Promise<{ certId: string; slug: string }> }) {
  const { certId, slug } = await params;
  const cert = getCert(certId);
  if (!cert) notFound();
  const md = getGuide(certId, slug);
  if (!md) notFound();
  return (
    <><TopNav /><main className="container learning-page" style={{ maxWidth: 800 }} id="maincontent">
      <nav className="learning-actions" aria-label="Lesson navigation"><Link href={`${certPath(cert.meta)}/learn`}>Back to {cert.meta.examCode} curriculum</Link><Link href={certPath(cert.meta)}>Practice options</Link></nav>
      <p className="learning-muted">Optional study guide. Read in any order; practice is always available.</p>
      <article className="guide">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{table:({children})=><div className="guide-table-scroll" role="region" aria-label="Comparison table" tabIndex={0}><table>{children}</table></div>}}>{md}</ReactMarkdown>
      </article>
      <nav className="learning-panel" aria-label="More lessons"><h2>More study guides</h2><ul>{listGuides(certId).filter(g => g.slug !== slug).map(g => <li key={g.slug}><Link href={`/guides/${certId}/${g.slug}`}>{g.title}</Link></li>)}</ul><Link className="btn btn-ghost" href={`${practicePath(cert.meta)}?mode=quick`}>Try quick practice</Link></nav>
    </main></>
  );
}
