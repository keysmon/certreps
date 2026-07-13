import type { Mode } from "./types";

const MODE_LABEL: Record<Mode, string> = {
  quick: "Quick Practice",
  drill: "Domain Drill",
  mock: "Full Mock",
  retry: "Retry Missed",
};

/** Display label for an attempt's mode. A study run (reveal-as-you-go full mock) reads
 *  "Study Mock" so it is never confused with the timed exam mock in resume lines or history. */
export function attemptLabel(mode: Mode, reveal?: boolean): string {
  if (mode === "mock" && reveal) return "Study Mock";
  return MODE_LABEL[mode] ?? mode;
}
