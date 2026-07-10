"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase/client";
import { useSession } from "@/lib/supabase/useSession";
import { readAll, clearAll } from "@/lib/storage";
import { readPrefs, setPref, clearPrefs, type Prefs } from "@/lib/prefs";
import { getTheme, toggleTheme, type Theme } from "@/lib/theme";
import { initials } from "@/lib/initials";
import "./settings.css";

// Glyph via fromCharCode (craft convention) so the source stays ASCII-clean.
const MIDDOT = String.fromCharCode(183);

interface NotifRow {
  key: keyof Prefs;
  label: string;
  sub: string;
}

// Notification rows keep the design copy plus an honest sub-line: these are stored intentions for
// features that have not launched, so nothing here promises an email or push will actually fire.
const NOTIF_ROWS: NotifRow[] = [
  { key: "reminders", label: "Study reminders", sub: "A gentle nudge if you haven't practiced in a few days. Saved for when notifications launch." },
  { key: "newCerts", label: "New certification alerts", sub: "When a cert in a role you follow is added. Saved for when notifications launch." },
  { key: "weekly", label: "Weekly readiness email", sub: "A Monday summary of your readiness and weak areas. Saved for when notifications launch." },
];

/**
 * Account & preferences. Session comes from the shared useSession hook (same subscription as
 * TopNav/AuthButton). Notification prefs persist to lib/prefs (certreps.prefs.v1); the sync row is
 * NOT a stored pref - it reflects the real session (on while signed in, disabled otherwise), so a
 * toggle can never disagree with what sync actually does. Export/Delete move here from the old
 * account page unchanged: export downloads the local store as JSON; delete removes cloud rows,
 * clears local data, signs out, and returns home (an honest alert if the cloud delete fails).
 */
export function SettingsClient() {
  const router = useRouter();
  const { session } = useSession();
  // SSR-safe: /settings is statically prerendered, so the initial render MUST be deterministic
  // defaults (what the server HTML contains). Reading localStorage in the useState initializer
  // would desync on a hard reload - the prerendered DOM shows OFF while state holds the stored
  // value, and React does not patch hydrated attributes, so the first click flips storage with no
  // visible change. Load the stored prefs in an effect instead (mirrors AccountClient's attempts load).
  const [prefs, setPrefs] = useState<Prefs>({ reminders: false, newCerts: false, weekly: false });
  // Theme follows the same SSR-safe rule: dark default on the server/first render, real value after
  // mount. The no-flash script already applied the theme visually; this only syncs the switch.
  const [theme, setThemeState] = useState<Theme>("dark");
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const email = session?.user.email ?? undefined;

  // Load stored prefs + theme after hydration (see the SSR-safe note on the useState above).
  useEffect(() => {
    setPrefs(readPrefs());
    setThemeState(getTheme());
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  }

  function toggle(key: keyof Prefs) {
    const next = setPref(key, !prefs[key]);
    setPrefs(next);
    showToast(next[key] ? "Turned on" : "Turned off");
  }

  function onToggleTheme() {
    const next = toggleTheme();
    setThemeState(next);
    showToast(next === "light" ? "Light theme on" : "Dark theme on");
  }

  // Moved verbatim from the old account page: local store -> pretty JSON -> download.
  function onExport() {
    const blob = new Blob([JSON.stringify(readAll(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `certreps-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    showToast("Exported your data");
  }

  // Moved verbatim from the old account page: cloud delete (honest failure alert), then clear local
  // and sign out, then home. supabase-js v2 resolves with { error } rather than throwing.
  async function onDelete() {
    if (!window.confirm("Delete all your practice data from this device and the cloud? This cannot be undone.")) return;
    const supabase = getSupabase();
    const userId = session?.user.id;
    try {
      if (supabase && userId) {
        const { error } = await supabase.from("attempts").delete().eq("user_id", userId);
        if (error) {
          console.warn("delete:", error);
          window.alert("Your cloud data could not be deleted right now - it may reappear when you next sign in. Local data was still cleared.");
        }
      }
    } catch (e) {
      console.warn("delete:", e); // network-level throw: same honest path as above
      window.alert("Your cloud data could not be deleted right now - it may reappear when you next sign in. Local data was still cleared.");
    }
    clearAll();
    clearPrefs(); // honest to the "Delete all my data" label - wipe preferences too, not just attempts
    try {
      await supabase?.auth.signOut();
    } catch {
      /* signing out is best-effort - the local data is already gone */
    }
    router.push("/");
  }

  function onSignOut() {
    getSupabase()?.auth.signOut();
    showToast("Signed out");
  }

  return (
    <main className="st-wrap">
      <div className="st-eyebrow">Settings</div>
      <h1 className="st-h1">Account &amp; preferences</h1>

      <section className="st-card">
        <h2>Account</h2>
        {session ? (
          <>
            <p className="cd">Signed in - progress syncs automatically.</p>
            <div className="st-row">
              <span className="st-avatar" aria-hidden="true">{initials(email)}</span>
              <div className="rt">
                <div className="rl">{email}</div>
                <div className="rs">Signed in via email {MIDDOT} synced</div>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={onSignOut}>
                Sign out
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="cd">You are practicing without an account. Progress is saved on this device only.</p>
            <div className="st-row">
              <div className="rt">
                <div className="rl">Not signed in</div>
                <div className="rs">Sign in to sync across devices and back up your reps.</div>
              </div>
              <Link className="btn btn-primary btn-sm" href="/login">
                Sign in to sync
              </Link>
            </div>
          </>
        )}
      </section>

      <section className="st-card">
        <h2>Appearance</h2>
        <p className="cd">Choose how CertReps looks on this device.</p>
        <div className="st-row">
          <div className="rt">
            <div className="rl">Light theme</div>
            <div className="rs">Dark is the default. Your choice is remembered on this device.</div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={theme === "light" ? "true" : "false"}
            aria-label="Light theme"
            className={`st-switch${theme === "light" ? " on" : ""}`}
            onClick={onToggleTheme}
          />
        </div>
      </section>

      <section className="st-card">
        <h2>Sync &amp; notifications</h2>
        <p className="cd">Control what CertReps saves and when it nudges you.</p>

        {/* Sync reflects the real session, not a stored pref - always disabled here. */}
        <div className="st-row">
          <div className="rt">
            <div className="rl">Sync progress across devices</div>
            <div className="rs">
              {session ? "On while signed in - sign out to stop syncing." : "Requires an account."}
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={session ? "true" : "false"}
            aria-label="Sync progress across devices"
            className={`st-switch${session ? " on" : ""}`}
            disabled
          />
        </div>

        {NOTIF_ROWS.map((r) => (
          <div className="st-row" key={r.key}>
            <div className="rt">
              <div className="rl">{r.label}</div>
              <div className="rs">{r.sub}</div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs[r.key] ? "true" : "false"}
              aria-label={r.label}
              className={`st-switch${prefs[r.key] ? " on" : ""}`}
              onClick={() => toggle(r.key)}
            />
          </div>
        ))}
      </section>

      <section className="st-card">
        <h2>Your data</h2>
        <p className="cd">Your practice data is yours. Take it or wipe it anytime.</p>
        <div className="st-row">
          <div className="rt">
            <div className="rl">Export my data</div>
            <div className="rs">Download everything as a JSON file.</div>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onExport}>
            Export
          </button>
        </div>
        <div className="st-row">
          <div className="rt">
            <div className="rl danger">Delete all my data</div>
            <div className="rs">Deletes your practice data and preferences on this device, removes your cloud data, then signs you out. Cannot be undone.</div>
          </div>
          <button type="button" className="btn btn-danger btn-sm" onClick={onDelete}>
            Delete
          </button>
        </div>
      </section>

      <p className="st-foot">CertReps {MIDDOT} free forever {MIDDOT} no signup to practice</p>

      <div className={`st-toast${toast ? " show" : ""}`} role="status" aria-live="polite">
        {toast}
      </div>
    </main>
  );
}
