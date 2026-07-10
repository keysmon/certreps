import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getCert, listCerts } from "@/lib/certs";
import { PracticeClient } from "./PracticeClient";

export function generateStaticParams() {
  return listCerts().map((c) => ({ vendor: c.vendorSlug, certId: c.certId }));
}

export async function generateMetadata({ params }: { params: Promise<{ vendor: string; certId: string }> }): Promise<Metadata> {
  const { vendor, certId } = await params;
  const cert = getCert(certId);
  if (!cert || cert.meta.vendorSlug !== vendor) return {};
  return {
    title: `${cert.meta.examCode} Practice Session`,
    robots: { index: false }, // interactive question pages are not indexed (spec)
  };
}

export default async function PracticePage({ params }: { params: Promise<{ vendor: string; certId: string }> }) {
  const { vendor, certId } = await params;
  const cert = getCert(certId);
  if (!cert || cert.meta.vendorSlug !== vendor) notFound();
  // No .container width clamp here: the practice surface owns its chrome - a full-bleed sticky exam
  // bar plus a self-centering 860px stage (see ExamEngine / engine.css). The narrow container would
  // fight both.
  return (
    <main>
      <Suspense fallback={<p className="stage">Loading...</p>}>
        <PracticeClient certId={certId} />
      </Suspense>
    </main>
  );
}
