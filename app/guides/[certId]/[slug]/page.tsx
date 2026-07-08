import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
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
    <main className="container" style={{ paddingTop: 48, maxWidth: 720 }}>
      <article className="guide">
        <ReactMarkdown>{md}</ReactMarkdown>
      </article>
    </main>
  );
}
