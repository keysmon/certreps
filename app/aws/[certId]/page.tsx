import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pill } from "@/components/ui/Pill";
import { TopNav } from "@/components/ui/TopNav";
import { VendorDot, VENDORS } from "@/components/ui/VendorDot";
import { getCert, listCerts } from "@/lib/certs";
import { listGuides } from "@/lib/guides";
import { DomainRows, HeroCtas, ReadinessPanel } from "./CertDetailClient";
import "./cert-detail.css";

// ASCII-source convention (see app/page.tsx): typographic glyphs from the design copy are
// reproduced faithfully but written as escapes, never literals.
const DOT = String.fromCharCode(183); // U+00B7 middle dot
const EMDASH = String.fromCharCode(8212); // U+2014 em dash (verbatim in the design's section header)

export function generateStaticParams() {
  return listCerts().map((c) => ({ certId: c.certId }));
}

export async function generateMetadata({ params }: { params: Promise<{ certId: string }> }): Promise<Metadata> {
  const { certId } = await params;
  const cert = getCert(certId);
  if (!cert) return {};
  const { meta } = cert;
  return {
    title: { absolute: meta.seoTitle },
    description: meta.seoDescription.replace("{n}", String(meta.mockQuestionCount)),
  };
}

// How-it-works copy is verbatim from design/redesign/CertDetail.html.
const HOW = [
  { n: `01 ${DOT} Practice`, p: "Original scenario questions per domain. Miss one, see why immediately." },
  { n: `02 ${DOT} Simulate`, p: "Full-length mock under real exam timing and question count." },
  { n: `03 ${DOT} Read your gaps`, p: "An honest readiness report that tells you exactly what to drill next." },
];

export default async function CertPage({ params }: { params: Promise<{ certId: string }> }) {
  const { certId } = await params;
  const cert = getCert(certId);
  if (!cert) notFound();
  const meta = cert.meta;
  const bankSize = cert.bank.length;
  const guides = listGuides(certId);

  const vendor = VENDORS[meta.vendor.toLowerCase()];
  const accent = vendor?.c ?? "var(--gold)";
  const vendorName = vendor?.n ?? meta.vendor;

  // Same vendor, other certs -> compact "More in this track" rows to their detail pages.
  const related = listCerts().filter((c) => c.vendor === meta.vendor && c.certId !== meta.certId);

  return (
    <div className="cd-glow">
      <a href="#maincontent" className="skip-link">Skip to content</a>
      <TopNav />

      <main className="cd-wrap" id="maincontent">
        <nav className="cd-crumb" aria-label="Breadcrumb">
          <Link href="/catalog">Catalog</Link>
          <span className="cd-crumb-sep" aria-hidden="true">{DOT}</span>
          <span className="cd-crumb-vendor">{vendorName}</span>
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
          <HeroCtas certId={certId} mockMinutes={meta.mockMinutes} />
        </header>

        <div className="cd-grid">
          <div>
            <h2 className="cd-section-h">Domains {EMDASH} practice any</h2>
            <DomainRows
              certId={certId}
              passLinePct={meta.passLinePct}
              domains={meta.domains.map((d) => ({ name: d.name, weightPct: d.weightPct }))}
            />

            <section className="cd-panel cd-how-panel">
              <h3 className="cd-panel-h">How CertReps works</h3>
              <div className="cd-how">
                {HOW.map((s) => (
                  <div key={s.n}>
                    <div className="cd-how-n">{s.n}</div>
                    <p className="cd-how-p">{s.p}</p>
                  </div>
                ))}
              </div>
            </section>

            {guides.length > 0 && (
              <section className="cd-panel cd-guides-panel">
                <h3 className="cd-panel-h">Study guides</h3>
                <div className="cd-guides-list">
                  {guides.map((g) => (
                    <Link key={g.slug} href={`/guides/${certId}/${g.slug}`}>
                      {g.title}
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="cd-list">
            <ReadinessPanel certId={certId} passLinePct={meta.passLinePct} />

            <div className="cd-panel">
              <h3 className="cd-panel-h">What&apos;s inside</h3>
              <div className="cd-kv"><span className="muted">Practice questions</span><span className="cd-kv-v">{bankSize}</span></div>
              <div className="cd-kv"><span className="muted">Full mock</span><span className="cd-kv-v">Fresh mix every time</span></div>
              <div className="cd-kv"><span className="muted">Explanations w/ docs</span><span className="cd-kv-v">Every Q</span></div>
              <div className="cd-kv"><span className="muted">Mock length</span><span className="cd-kv-v">{meta.mockMinutes} min</span></div>
              <div className="cd-kv"><span className="muted">Last verified</span><span className="cd-kv-v">{meta.verified}</span></div>
            </div>

            <div className="cd-panel cd-nosignup">
              <div className="cd-nosignup-h">No signup to practice</div>
              <p className="cd-nosignup-p">
                Create a free account only if you want progress saved across devices.
              </p>
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <>
            <h2 className="cd-section-h cd-related-h">More in this track</h2>
            <div className="cd-related">
              {related.map((c) => {
                const rv = VENDORS[c.vendor.toLowerCase()];
                const rAccent = rv?.c ?? "var(--gold)";
                const rName = rv?.n ?? c.vendor;
                return (
                  <Link key={c.certId} href={`/aws/${c.certId}`} className="cd-related-row" aria-label={c.title}>
                    <VendorDot color={rAccent} size={9} />
                    <div className="cd-related-main">
                      <div className="cd-related-name">{c.title}</div>
                      <div className="cd-related-sub">{rName} {DOT} {c.examCode}</div>
                    </div>
                    <Pill tone="level">{c.level}</Pill>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
