import type { Metadata } from "next";
import { ReviewPastClient } from "./ReviewPastClient";

export const metadata: Metadata = {
  title: "Attempt review",
  robots: { index: false }, // private history - never indexed (matches /account idiom)
};

// [id] with no generateStaticParams + awaiting params keeps this route dynamically rendered.
// The attempt itself is read client-side from localStorage, so the server only serves the shell.
export default async function ReviewPastPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="container" style={{ paddingTop: 48, paddingBottom: 48 }}>
      <ReviewPastClient id={id} />
    </main>
  );
}
