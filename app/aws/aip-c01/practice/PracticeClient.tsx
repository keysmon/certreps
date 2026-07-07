"use client";
import { useSearchParams } from "next/navigation";
import { ExamEngine } from "@/components/engine/ExamEngine";
import type { Mode } from "@/lib/types";

const MODES: Mode[] = ["quick", "drill", "mock", "retry"];

export function PracticeClient() {
  const params = useSearchParams();
  const modeParam = params.get("mode") ?? "quick";
  const mode: Mode = (MODES as string[]).includes(modeParam) ? (modeParam as Mode) : "quick";
  const domain = params.get("domain") ?? undefined;
  // Engine contract: key by mode+domain - the engine samples once per mount.
  return <ExamEngine key={`${mode}-${domain ?? ""}`} mode={mode} domain={domain} />;
}
