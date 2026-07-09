import type { Metadata } from "next";
import { TopNav } from "@/components/ui/TopNav";
import { SettingsClient } from "./SettingsClient";
import "./settings.css";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false }, // private preferences - never indexed (matches /account, /login idiom)
};

// TopNav owns the auth surface here, so AuthButton suppresses itself on /settings.
export default function SettingsPage() {
  return (
    <div className="st-glow">
      <TopNav />
      <SettingsClient />
    </div>
  );
}
