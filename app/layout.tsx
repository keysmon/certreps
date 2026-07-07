import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PrepLoop — Free IT Certification Practice Exams",
  description:
    "Free, original practice exams for IT certifications. No signup. Not affiliated with AWS.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
