import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getCert, listCerts } from "@/lib/certs";
import { PracticeClient } from "./PracticeClient";

export function generateStaticParams() {
  return listCerts().map((c) => ({ certId: c.certId }));
}

export async function generateMetadata({ params }: { params: Promise<{ certId: string }> }): Promise<Metadata> {
  const { certId } = await params;
  const cert = getCert(certId);
  if (!cert) return {};
  return {
    title: `${cert.meta.examCode} Practice Session`,
    robots: { index: false }, // interactive question pages are not indexed (spec)
  };
}

export default async function PracticePage({ params }: { params: Promise<{ certId: string }> }) {
  const { certId } = await params;
  const cert = getCert(certId);
  if (!cert) notFound();
  return (
    <main className="container" style={{ paddingTop: 32, paddingBottom: 48 }}>
      <Suspense fallback={<p>Loading...</p>}>
        <PracticeClient certId={certId} />
      </Suspense>
    </main>
  );
}
