"use client";
import { useSearchParams } from "next/navigation";
import { ExamEngine } from "@/components/engine/ExamEngine";
import type { Mode } from "@/lib/types";

const MODES: Mode[] = ["quick", "drill", "mock", "retry"];

export function PracticeClient({ certId }: { certId: string }) {
  const params = useSearchParams();
  const modeParam = params.get("mode") ?? "quick";
  const mode: Mode = (MODES as string[]).includes(modeParam) ? (modeParam as Mode) : "quick";
  const domain = params.get("domain") ?? undefined;
  const resume = params.get("resume") ?? undefined;
  // Engine contract: key by mode+domain+resume - the engine samples/hydrates once per mount, so a
  // changed resume id must force a clean remount.
  return <ExamEngine key={`${mode}-${domain ?? ""}-${resume ?? ""}`} certId={certId} mode={mode} domain={domain} resumeAttemptId={resume} />;
}
