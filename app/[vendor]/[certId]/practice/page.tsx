import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getCert, listCerts } from "@/lib/certs";
import { TopNav } from "@/components/ui/TopNav";
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
  // Site nav is now reachable during an exam (user request, v1h - reversing the earlier
  // "distraction-free / chrome-free" stance): TopNav mounts ABOVE the slim exam bar so leaving
  // mid-session is one click away (lossless via the write-through journal + resume interstitial).
  // No .container width clamp: below TopNav the practice surface still owns its own chrome - a
  // full-bleed sticky exam bar plus a self-centering 860px stage (see ExamEngine / engine.css).
  return (
    <>
      <TopNav />
      <main>
        <Suspense fallback={<p className="stage">Loading...</p>}>
          <PracticeClient certId={certId} />
        </Suspense>
      </main>
    </>
  );
}
