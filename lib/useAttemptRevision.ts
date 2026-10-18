"use client";
import { useEffect, useState } from "react";

/** Re-read saved progress after writes, cross-tab changes and returning to a cached view. */
export function useAttemptRevision(): number {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setRevision((n) => n + 1);
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === "certreps.attempts.v1") refresh();
    };
    window.addEventListener("certreps:attempts-changed", refresh);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    return () => {
      window.removeEventListener("certreps:attempts-changed", refresh);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
    };
  }, []);
  return revision;
}
