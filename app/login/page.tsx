import type { Metadata } from "next";
import { LoginClient } from "./LoginClient";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false }, // account gateway - not indexed (matches practice page)
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="container" style={{ paddingTop: 72, paddingBottom: 48 }}>
      <LoginClient failed={error === "auth"} />
    </main>
  );
}
