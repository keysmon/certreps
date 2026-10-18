"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Attempt } from "@/lib/types";
import { getAttempt } from "@/lib/storage";
import { getMeta, isResumableAttempt } from "@/lib/bank";
import { getCert } from "@/lib/certs";
import { certPath, practicePath, resumeParams } from "@/lib/routes";
import { questionsByIds } from "@/lib/sampler";
import { Results } from "@/components/engine/Results";

/**
 * Read-only replay of a single past attempt. localStorage is the engine's source of truth,
 * so the attempt is read in an effect (never in render): `undefined` while unresolved, `null`
 * once we know this device has no such attempt. That keeps the page SSR-safe (server renders the
 * loading shell) and lets a finished attempt render through the exact same Results surface the
 * live engine shows - zero bespoke result UI.
 */
export function ReviewPastClient({ id }: { id: string }) {
  const [attempt, setAttempt] = useState<Attempt | null | undefined>(undefined);

  useEffect(() => {
    setAttempt(getAttempt(id));
  }, [id]);

  if (attempt === undefined) {
    return <p className="muted">Loading...</p>;
  }

  if (attempt === null) {
    // A cloud-synced attempt made on another device legitimately is not in this device's
    // localStorage, so this is not a 404 - say plainly that it lives elsewhere. No attempt
    // means no certId to resolve, so the escape hatch falls back to the default cert.
    const meta = getMeta();
    return (
      <div className="card">
        <p style={{ margin: "0 0 14px" }}>This attempt is not on this device.</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link className="btn btn-primary" href="/account">
            Your account
          </Link>
          <Link className="btn btn-ghost" href={certPath(meta)}>
            Back to {meta.examCode}
          </Link>
        </div>
      </div>
    );
  }

  // Resolve the attempt's own cert. A cert dropped from the registry (getCert -> null) must never
  // reach getBank/getMeta, which throw on an unknown certId - render a distinct card instead.
  const cert = getCert(attempt.certId);
  if (!cert) {
    return (
      <div className="card">
        <p style={{ margin: "0 0 14px" }}>This attempt is from a certification no longer available.</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link className="btn btn-primary" href="/account">
            Your account
          </Link>
        </div>
      </div>
    );
  }
  const meta = cert.meta;

  if (attempt.finishedAt === null && !isResumableAttempt(attempt, cert.bank)) {
    return (
      <div className="card">
        <p style={{ margin: "0 0 14px" }}>This question set changed after review. Your previous answers are preserved; start a fresh session to continue practicing.</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link className="btn btn-primary" href={`${practicePath(meta)}?mode=quick`}>
            Start fresh practice
          </Link>
          <Link className="btn btn-ghost" href="/account">Back to your account</Link>
        </div>
      </div>
    );
  }

  if (attempt.finishedAt === null) {
    // Resume rehydrates the unfinished attempt in the engine (Task 8). Only reachable for a
    // device-LOCAL attempt: getAttempt reads localStorage, so a cloud-only in-progress attempt
    // from another device renders the "not on this device" card above, never this resume link.
    const resumeHref = `${practicePath(meta)}?${resumeParams(attempt)}`;
    return (
      <div className="card">
        <p style={{ margin: "0 0 14px" }}>This attempt is still in progress.</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link className="btn btn-primary" href={resumeHref}>
            Resume attempt
          </Link>
          <Link className="btn btn-ghost" href="/account">
            Back to your account
          </Link>
        </div>
      </div>
    );
  }

  const questions = questionsByIds(cert.bank, attempt.questionIds);
  return (
    <>
      <Link
        href="/account"
        className="muted"
        style={{ display: "inline-block", marginBottom: 16, fontSize: 13.5 }}
      >
        Back to your account
      </Link>
      <Results attempt={attempt} questions={questions} meta={meta} />
    </>
  );
}
