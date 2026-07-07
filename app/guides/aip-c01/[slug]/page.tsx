import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { getGuide, guideTitle, listGuides } from "@/lib/guides";

export function generateStaticParams() {
  return listGuides("aip-c01").map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const md = getGuide("aip-c01", slug);
  const title = md ? guideTitle(md) : "Study guide";
  return { title, description: `${title} - free AIP-C01 study guide with linked practice questions.` };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const md = getGuide("aip-c01", slug);
  if (!md) notFound();
  return (
    <main className="container" style={{ paddingTop: 48, maxWidth: 720 }}>
      <article className="guide">
        <ReactMarkdown>{md}</ReactMarkdown>
      </article>
    </main>
  );
}
