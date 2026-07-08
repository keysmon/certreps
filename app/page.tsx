import Link from "next/link";
import { listCerts } from "@/lib/certs";

export default function Home() {
  const certs = listCerts();
  return (
    <main className="container" style={{ paddingTop: 56 }}>
      <p className="eyebrow">Free certification prep - no signup</p>
      <h1 style={{ fontSize: "clamp(30px, 5vw, 44px)", lineHeight: 1.1, margin: "8px 0 14px" }}>
        Practice. Miss. Retry.<br />Walk in ready.
      </h1>
      <p style={{ color: "var(--muted)", maxWidth: 560 }}>
        CertReps is a free practice-exam site for engineers: original scenario questions with
        real explanations, a full exam simulator, and a readiness read that tells you what to
        drill next. No account, no paywall, no brain dumps.
      </p>
      {certs.map((meta) => (
        <div key={meta.certId} className="card" style={{ marginTop: 32 }}>
          <p className="eyebrow">{meta.vendor} - {meta.level}</p>
          <h2 style={{ margin: "6px 0 4px" }}>{meta.title}</h2>
          <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 16px" }}>
            {meta.examCode} - full mock, domain drills, quick practice - Verified {meta.verified}
          </p>
          <Link className="btn btn-primary" href={`/aws/${meta.certId}`}>Start practicing</Link>
        </div>
      ))}
    </main>
  );
}
