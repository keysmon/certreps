import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pill } from "@/components/ui/Pill";
import { TopNav } from "@/components/ui/TopNav";
import { VendorDot, VENDORS } from "@/components/ui/VendorDot";
import type { CSSProperties } from "react";
import { getPracticeBank } from "@/lib/bank";
import aipReview from "@/content/aip-c01/review.json";
import { getCert, listCerts } from "@/lib/certs";
import { FirstAnswerPerformance } from "@/components/FirstAnswerPerformance";
import { ExamDetails } from "@/components/ExamDetails";
import { PathToReady } from "./CertDetailClient";
import "./cert-detail.css";

// ASCII-source convention (see app/page.tsx): typographic glyphs from the design copy are
// reproduced faithfully but written as escapes, never literals.
const DOT = String.fromCharCode(183); // U+00B7 middle dot

export function generateStaticParams() {
  return listCerts().map((c) => ({ vendor: c.vendorSlug, certId: c.certId }));
}

export async function generateMetadata({ params }: { params: Promise<{ vendor: string; certId: string }> }): Promise<Metadata> {
  const { vendor, certId } = await params;
  const cert = getCert(certId);
  // One canonical URL per cert: a mismatched vendor segment yields no metadata (the page notFounds).
  if (!cert || cert.meta.vendorSlug !== vendor) return {};
  const { meta } = cert;
  return {
    title: { absolute: meta.seoTitle },
    description: meta.seoDescription.replace("{n}", String(meta.mockQuestionCount)),
  };
}

const eyebrow: CSSProperties = {
  fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: ".16em",
  textTransform: "uppercase", color: "var(--faint)", margin: "0 0 16px",
};

export default async function CertPage({ params }: { params: Promise<{ vendor: string; certId: string }> }) {
  const { vendor, certId } = await params;
  const cert = getCert(certId);
  // One canonical URL per cert: /[vendor]/[certId] only serves when the segment matches the
  // cert's own vendorSlug, so /gcp/aip-c01 (an alias to an AWS cert) 404s instead of duplicating.
  if (!cert || cert.meta.vendorSlug !== vendor) notFound();
  const meta = cert.meta;

  const vendorInfo = VENDORS[meta.vendorSlug];
  const accent = vendorInfo?.c ?? "var(--gold)";
  const vendorName = vendorInfo?.n ?? meta.vendor;

  return (
    <div className="cd-glow">
      <a href="#maincontent" className="skip-link">Skip to content</a>
      <TopNav />

      <main className="cd-wrap cd-wrap-narrow" id="maincontent">
        <nav className="cd-crumb" aria-label="Breadcrumb">
          <Link href="/catalog">&lsaquo; All exams</Link>
        </nav>

        <header className="cd-hero">
          <span className="cd-hero-accent" style={{ background: accent }} aria-hidden="true" />
          <div className="cd-metarow">
            <VendorDot color={accent} size={11} />
            <span className="cd-vendor">{vendorName}</span>
            <Pill tone="level">{meta.level}</Pill>
            <Pill>{meta.examCode}</Pill>
          </div>
          <h1 className="cd-h1">{meta.title}</h1>
          <p className="cd-blurb">
            Original scenario questions with real explanations, mapped to the official {meta.examCode} exam
            guide. Practice one domain at a time, or take a timed practice mock.
          </p>
          {meta.certId === "aip-c01" && (
            <p className="cd-blurb">
              The AWS exam has 75 questions in 180 minutes: 65 scored and 10 unidentified unscored.
              This mock scores all 75 practice questions. Its 75% study target is independent of
              AWS&apos;s 750/1000 scaled passing score and does not predict an exam result.
            </p>
          )}
        </header>

        {meta.certId === "aip-c01" && (
          <p className="cd-blurb">
            {getPracticeBank(certId).length} active practice questions. Content reviewed {aipReview.reviewedOn};
            {" "}{aipReview.unresolved.length} unresolved questions excluded from practice.
          </p>
        )}

        <section className="learning-panel"><h2>Want to learn the topics?</h2><p>Browse the curriculum and available lessons whenever you need them. You can start practicing directly.</p><Link className="btn btn-ghost" href={`/${meta.vendorSlug}/${certId}/learn`}>Explore curriculum</Link></section>
        {certId === "aip-c01" && <section className="learning-panel"><h2>Try an incident challenge</h2><p>Inspect fictional logs and configurations, diagnose a cause, choose a fix, and verify it. Optional exercises with separate results.</p><Link className="btn btn-ghost" href="/aws/aip-c01/incidents">Explore incident challenges</Link></section>}
        <ExamDetails meta={meta} />
        <div style={eyebrow}>Your practice</div>

        <PathToReady
          certId={certId}
          vendorSlug={meta.vendorSlug}
          mockMinutes={meta.mockMinutes}
          mockQuestionCount={meta.mockQuestionCount}
          passLinePct={meta.passLinePct}
          passLineOfficial={meta.passLineOfficial}
          domains={meta.domains.map((d) => ({ name: d.name, weightPct: d.weightPct }))}
        />

        <FirstAnswerPerformance meta={meta} />
        <p style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: "11.5px", color: "var(--faint)", margin: "30px 0 0" }}>
          {meta.mockQuestionCount}-question mock {DOT} every answer explained with a docs link {DOT} last verified {meta.verified}
        </p>
      </main>
    </div>
  );
}
