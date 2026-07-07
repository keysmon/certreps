"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Attempt } from "@/lib/types";
import { getInProgress } from "@/lib/storage";
import { getMeta } from "@/lib/bank";

const MODE_LABEL: Record<string, string> = {
  quick: "Quick Practice",
  drill: "Domain Drill",
  mock: "Full Mock",
  retry: "Retry Missed",
};

/**
 * Cert-page island: offers to resume the latest LOCAL unfinished attempt. Read in an effect
 * (localStorage is the engine's source of truth, and the cert page is a server component), so
 * it renders nothing on the server and appears only once a device-local in-progress attempt
 * exists. Single-device-in-progress semantics live in getInProgress (Task 4 review).
 */
export function ResumeBanner() {
  const meta = getMeta();
  const [attempt, setAttempt] = useState<Attempt | null>(null);

  useEffect(() => {
    setAttempt(getInProgress(meta.certId));
  }, [meta.certId]);

  if (!attempt) return null;

  const answered = Object.keys(attempt.results).length;
  const total = attempt.questionIds.length;
  const label = MODE_LABEL[attempt.mode] ?? attempt.mode;
  const params = new URLSearchParams({ mode: attempt.mode, resume: attempt.attemptId });
  if (attempt.domain) params.set("domain", attempt.domain); // drill carries its domain
  const href = `/aws/${meta.certId}/practice?${params.toString()}`;

  return (
    <div
      className="card"
      style={{ marginTop: 18, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}
    >
      <p style={{ margin: 0 }}>
        <strong>You have a {label} in progress</strong>{" "}
        <span className="muted">({answered} of {total} answered)</span>
      </p>
      <Link className="btn btn-primary" href={href}>
        Resume
      </Link>
    </div>
  );
}
