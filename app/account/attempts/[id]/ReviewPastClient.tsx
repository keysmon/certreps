"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Attempt } from "@/lib/types";
import { getAttempt } from "@/lib/storage";
import { getBank, getMeta } from "@/lib/bank";
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
  const meta = getMeta();
  const [attempt, setAttempt] = useState<Attempt | null | undefined>(undefined);

  useEffect(() => {
    setAttempt(getAttempt(id));
  }, [id]);

  if (attempt === undefined) {
    return <p className="muted">Loading...</p>;
  }

  if (attempt === null) {
    // A cloud-synced attempt made on another device legitimately is not in this device's
    // localStorage, so this is not a 404 - say plainly that it lives elsewhere.
    return (
      <div className="card">
        <p style={{ margin: "0 0 14px" }}>This attempt is not on this device.</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link className="btn btn-primary" href="/account">
            Your account
          </Link>
          <Link className="btn btn-ghost" href={`/aws/${meta.certId}`}>
            Back to {meta.examCode}
          </Link>
        </div>
      </div>
    );
  }

  if (attempt.finishedAt === null) {
    // TODO(Task 8): once resume-in-progress lands, swap this card for a resume link
    // (`/aws/<certId>/practice?resume=<id>`) that rehydrates the unfinished attempt.
    return (
      <div className="card">
        <p style={{ margin: "0 0 14px" }}>This attempt is still in progress.</p>
        <Link className="btn btn-primary" href="/account">
          Back to your account
        </Link>
      </div>
    );
  }

  const questions = questionsByIds(getBank(), attempt.questionIds);
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
