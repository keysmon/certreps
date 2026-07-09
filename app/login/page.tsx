import type { Metadata } from "next";
import { LoginClient } from "./LoginClient";
import "./login.css";

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
    <main className="li-page">
      <LoginClient failed={error === "auth"} />
    </main>
  );
}
