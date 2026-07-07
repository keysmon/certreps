import type { Metadata } from "next";
import { AccountClient } from "./AccountClient";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false }, // private history - never indexed (matches /login idiom)
};

// welcome=1 is set by the OAuth callback (Task 3); it drives a one-time fullSync on mount.
// Reading it server-side and passing a boolean avoids useSearchParams + its Suspense flash.
export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { welcome } = await searchParams;
  return (
    <main className="container" style={{ paddingTop: 48, paddingBottom: 48 }}>
      <AccountClient welcome={welcome === "1"} />
    </main>
  );
}
