import type { Metadata } from "next";
import { listCerts, getCert } from "@/lib/certs";
import { TopNav } from "@/components/ui/TopNav";
import { CatalogClient, type CatalogCert } from "./CatalogClient";
import "./catalog.css";

// Indexable discovery page: the layout template renders this as "Certification Catalog | CertReps".
// The grid server-renders from the static registry (SEO); progress + Status hydrate client-side.
export const metadata: Metadata = {
  title: "Certification Catalog",
  description:
    "Browse CertReps' free certification practice exams. Filter by vendor, level, and your readiness, then drill original scenario questions with real explanations. No signup required.",
};

export default function CatalogPage() {
  const certs: CatalogCert[] = listCerts().map((m) => ({
    certId: m.certId,
    vendor: m.vendor,
    title: m.title,
    examCode: m.examCode,
    level: m.level,
    questions: getCert(m.certId)?.bank.length ?? 0,
    passLinePct: m.passLinePct,
  }));

  return (
    <div className="ct-glow">
      <a href="#maincontent" className="skip-link">Skip to content</a>
      <TopNav active="catalog" />
      <CatalogClient certs={certs} />
    </div>
  );
}
