import type { Metadata } from "next";
import { Bricolage_Grotesque, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { AuthButton } from "@/components/AuthButton";
import "./globals.css";

// Self-hosted via next/font (downloaded at build, served from /_next/static/media -
// no runtime Google Fonts CDN dependency). Exposed as CSS variables that globals.css
// feeds into --font-display / --font-mono.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-bricolage",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://certreps.dev"),
  title: { default: "CertReps - Free IT Certification Practice Exams", template: "%s | CertReps" },
  description:
    "Free, original, deeply-explained practice exams for IT certifications. No signup required.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${jetbrainsMono.variable}`}>
      <body>
        <AuthButton />
        {children}
        <footer className="site">
          <div className="container">
            <p>
              CertReps is an independent study resource. Not affiliated with, endorsed by, or
              sponsored by any certification vendor. AWS, Databricks, NVIDIA, Google Cloud, and
              all certification names are trademarks of their respective owners. All questions
              are original - never actual exam content.
            </p>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
