import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pill } from "@/components/ui/Pill";
import { TopNav } from "@/components/ui/TopNav";
import { VendorDot, VENDORS } from "@/components/ui/VendorDot";
import type { CSSProperties } from "react";
import { getCert, listCerts } from "@/lib/certs";
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
            guide. Practice one domain at a time, or sit the full mock under exam timing.
          </p>
        </header>

        <div style={eyebrow}>Your path to ready</div>

        <PathToReady
          certId={certId}
          vendorSlug={meta.vendorSlug}
          mockMinutes={meta.mockMinutes}
          mockQuestionCount={meta.mockQuestionCount}
          passLinePct={meta.passLinePct}
          passLineOfficial={meta.passLineOfficial}
          domains={meta.domains.map((d) => ({ name: d.name, weightPct: d.weightPct }))}
        />

        <p style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: "11.5px", color: "var(--faint)", margin: "30px 0 0" }}>
          {meta.mockQuestionCount}-question mock {DOT} every answer explained with a docs link {DOT} last verified {meta.verified}
        </p>
      </main>
    </div>
  );
}
