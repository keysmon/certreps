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

// Applied before first paint so an alternate-theme device never flashes Signal Gold. Inert for the
// default (Signal Gold) case - it carries no attribute, so an absent/"dark" preference does nothing.
// Mirrors lib/theme (normalize + applyTheme): legacy "dark"->signal, "light"->day, then any of the
// four alternates sets data-theme. suppressHydrationWarning on <html> below covers the attribute this
// adds ahead of React hydrating the element.
const NO_FLASH_THEME = `try{var t=localStorage.getItem('certreps.theme');if(t==='dark')t='signal';else if(t==='light')t='day';if(t&&['ocean','violet','graphite','day'].indexOf(t)>=0)document.documentElement.setAttribute('data-theme',t)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME }} />
      </head>
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
