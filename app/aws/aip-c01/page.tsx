import type { Metadata } from "next";
import Link from "next/link";
import { getBank, getMeta } from "@/lib/bank";

export const metadata: Metadata = {
  title: "Free AIP-C01 Practice Exam - AWS Certified Generative AI Developer Professional",
  description:
    "Free full-length AIP-C01 practice exam with 65 original scenario questions, explanations, and per-domain readiness scoring. No signup. Not affiliated with AWS.",
};

export default function CertPage() {
  const meta = getMeta();
  const bankSize = getBank().length;
  return (
    <main className="container" style={{ paddingTop: 48 }}>
      <p className="eyebrow">{meta.vendor} certification - {meta.level} - Verified {meta.verified}</p>
      <h1 style={{ fontSize: "clamp(26px, 4.5vw, 38px)", lineHeight: 1.15, margin: "8px 0 10px" }}>{meta.title}</h1>
      <p className="muted">
        {bankSize} original practice questions - every answer explained with a link to the AWS docs.
      </p>

      <div className="card" style={{ margin: "24px 0" }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Exam domains</h2>
        {meta.domains.map((d) => (
          <div key={d.name} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "7px 0", borderBottom: "1px solid var(--line)", fontSize: 14 }}>
            <span>{d.name}</span>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--muted)" }}>{d.weightPct}%</span>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
        <div className="card">
          <h3>Full Mock</h3>
          <p className="small-copy">65 questions, {meta.mockMinutes}-minute countdown, exam-day navigation, results at the end.</p>
          <Link className="btn btn-primary" href="/aws/aip-c01/practice?mode=mock">Start full mock</Link>
        </div>
        <div className="card">
          <h3>Quick Practice</h3>
          <p className="small-copy">10 questions with instant feedback and explanations.</p>
          <Link className="btn btn-primary" href="/aws/aip-c01/practice?mode=quick">Quick 10</Link>
        </div>
        <div className="card">
          <h3>Domain Drill</h3>
          <p className="small-copy">Focus one domain, instant feedback.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {meta.domains.map((d) => (
              <Link key={d.tag} href={`/aws/aip-c01/practice?mode=drill&domain=${encodeURIComponent(d.name)}`} style={{ fontSize: 13.5 }}>
                {d.tag}: {d.name}
              </Link>
            ))}
          </div>
        </div>
        <div className="card">
          <h3>Retry my missed</h3>
          <p className="small-copy">Re-quiz exactly what you got wrong before.</p>
          <Link className="btn btn-ghost" href="/aws/aip-c01/practice?mode=retry">Retry missed</Link>
        </div>
      </div>
    </main>
  );
}
