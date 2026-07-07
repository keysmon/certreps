import type { Metadata } from "next";
import { Suspense } from "react";
import { PracticeClient } from "./PracticeClient";

export const metadata: Metadata = {
  title: "AIP-C01 Practice Session",
  robots: { index: false }, // interactive question pages are not indexed (spec)
};

export default function PracticePage() {
  return (
    <main className="container" style={{ paddingTop: 32, paddingBottom: 48 }}>
      <Suspense fallback={<p>Loading...</p>}>
        <PracticeClient />
      </Suspense>
    </main>
  );
}
