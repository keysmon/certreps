import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://preploop.dev"),
  title: { default: "PrepLoop - Free IT Certification Practice Exams", template: "%s | PrepLoop" },
  description:
    "Free, original, deeply-explained practice exams for IT certifications. No signup required.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <footer className="site">
          <div className="container">
            <p>
              PrepLoop is an independent study resource. Not affiliated with, endorsed by, or
              sponsored by Amazon Web Services. AWS and AWS certification names are trademarks
              of Amazon.com, Inc. or its affiliates. All questions are original - never actual
              exam content.
            </p>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
