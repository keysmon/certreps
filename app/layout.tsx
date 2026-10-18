import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { AuthButton } from "@/components/AuthButton";
import { WorkspaceNav } from "@/components/ui/WorkspaceNav";
import "./globals.css";
import "./industrial.css";
import "./learning.css";

// Self-hosted mono type for technical labels; display text uses the system sans stack.
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://certreps.dev"),
  title: { default: "CertReps - Free IT Certification Practice Exams", template: "%s | CertReps" },
  description:
    "Free, original, deeply-explained practice exams for IT certifications. No signup required.",
};

// Applied before first paint so saved alternate palettes never flash the Industrial default.
// Industrial carries no attribute; legacy dark/light still map to Signal Gold/Daylight.
// Mirrors lib/theme (normalize + applyTheme): legacy "dark"->signal, "light"->day, then any of the
// five alternates sets data-theme. suppressHydrationWarning on <html> below covers the attribute this
// adds ahead of React hydrating the element.
const NO_FLASH_THEME = `try{var t=localStorage.getItem('certreps.theme');if(t==='dark')t='signal';else if(t==='light')t='day';if(t&&['signal','ocean','violet','graphite','day'].indexOf(t)>=0)document.documentElement.setAttribute('data-theme',t)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jetbrainsMono.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME }} />
      </head>
      <body className="industrial-shell">
        <WorkspaceNav />
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
