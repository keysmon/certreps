import type { Metadata } from "next";
import { TopNav } from "@/components/ui/TopNav";
import { AccountClient } from "./AccountClient";
import "./account.css";

export const metadata: Metadata = {
  title: "Your progress",
  robots: { index: false }, // private history - never indexed (matches /login idiom)
};

// welcome=1 is set by the OAuth callback (Task 3); it drives a one-time fullSync on mount.
// Reading it server-side and passing a boolean avoids useSearchParams + its Suspense flash.
// AccountClient owns the <main> (the 1180 pg-wrap); TopNav owns the auth surface here, so
// AuthButton suppresses itself on /account.
export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { welcome } = await searchParams;
  return (
    <div className="pg-glow">
      <TopNav active="progress" />
      <AccountClient welcome={welcome === "1"} />
    </div>
  );
}
