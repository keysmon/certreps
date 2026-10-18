import Link from "next/link";
import { listCerts } from "@/lib/certs";
import { certPath } from "@/lib/routes";
import { CertCard } from "@/components/ui/CertCard";
import { VENDORS } from "@/components/ui/VendorDot";
import { getPracticeBank } from "@/lib/bank";
import { TopNav } from "@/components/ui/TopNav";
import "./landing.css";

// No metadata export: the landing page inherits layout.tsx's default title/description
// (the SERP metadata a redesign must not disturb).

// ASCII-source convention (see components/engine/Results.tsx): typographic characters
// in the design copy are reproduced faithfully but written as escapes, never literals.
const DOT = String.fromCharCode(183); // U+00B7 middle dot
const ARROW = String.fromCharCode(8594); // U+2192 rightwards arrow
const EMDASH = String.fromCharCode(8212); // U+2014 em dash (verbatim in the step copy)

// How-it-works copy is final (plan Task 3).
const STEPS = [
  {
    n: `01 ${DOT} Practice`,
    h: "Drill a domain",
    p: `Answer original scenario questions one at a time. Miss one and see exactly why ${EMDASH} immediately, with a link to the source docs.`,
  },
  {
    n: `02 ${DOT} Simulate`,
    h: "Sit the full mock",
    p: `Real exam timing and question count. No peeking ${EMDASH} just like the day itself, so the nerves are gone before they matter.`,
  },
  {
    n: `03 ${DOT} Read your gaps`,
    h: "Know when you're ready",
    p: "A readiness report scores every domain against your target and tells you the two things to drill before you book.",
  },
];

export default function Home() {
  const certs = listCerts();

  return (
    <div className="lp-glow">
      <a href="#maincontent" className="skip-link">Skip to content</a>
      <TopNav />

      <main className="lp-wrap" id="maincontent">
        <section className="lp-hero">
          <span className="lp-eyebrow">
            <span className="lp-dot" />
            Free forever {DOT} no signup to practice
          </span>
          <h1>
            Practice. Miss. Retry.
            <br />
            <span className="lp-accent">Walk in ready.</span>
          </h1>
          <p className="lp-sub">
            Original scenario questions with real explanations, a full exam simulator, and an honest
            readiness read that tells you exactly what to drill next.
          </p>
          <div className="lp-cta">
            <Link className="btn btn-primary lp-hero-cta" href="/catalog">
              Browse {certs.length} certifications {ARROW}
            </Link>
            <a className="btn btn-ghost lp-hero-cta" href="#how">See how it works</a>
          </div>
          {/* Honesty rule (plan Task 3): chips render only vendors with LIVE content -
              derived from the registry, never the full VENDORS map, so breadth is real. */}
          <div className="lp-trust">
            {Array.from(new Set(listCerts().map((m) => m.vendorSlug))).map((slug) => (
              <span key={slug} className="lp-vchip">
                <span className="lp-vd" style={{ background: VENDORS[slug]?.c ?? "var(--gold)" }} />
                {VENDORS[slug]?.n ?? slug}
              </span>
            ))}
            <span className="lp-vchip lp-vchip-more">+ more coming</span>
          </div>
        </section>

        <section className="lp-sec" id="how">
          <div className="lp-sec-h">How it works</div>
          <h2 className="lp-sec-title">Three honest steps</h2>
          <div className="lp-steps">
            {STEPS.map((s) => (
              <div className="lp-step" key={s.n}>
                <div className="lp-step-n">{s.n}</div>
                <h3>{s.h}</h3>
                <p>{s.p}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="lp-sec">
          <div className="lp-trend-head">
            <h2 className="lp-trend-title">Trending certifications</h2>
            <Link className="lp-viewall" href="/catalog">View all {ARROW}</Link>
          </div>
          <div className="lp-trend-grid">
            {certs.map((meta) => (
              <CertCard
                key={meta.certId}
                meta={meta}
                href={certPath(meta)}
                questions={getPracticeBank(meta.certId).length}
                style={{ height: "100%" }}
              />
            ))}
          </div>
        </section>

        <section>
          <div className="lp-finalcta">
            <h2>Your next cert is one drill away.</h2>
            <p>No account needed to start. Pick a certification and take your first ten questions right now.</p>
            <Link className="btn btn-primary lp-hero-cta" href="/catalog">Find your certification {ARROW}</Link>
          </div>
        </section>
      </main>

      {/* Design's mono brand line - sits above the global legal disclaimer footer that
          layout.tsx renders after {children}. */}
      <p className="lp-footline">CertReps {DOT} free certification prep {DOT} questions verified Q3 2026</p>
    </div>
  );
}
