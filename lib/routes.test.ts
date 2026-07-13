import { describe, expect, it } from "vitest";
import { resumeParams } from "./routes";
import type { Attempt } from "./types";

const base = { attemptId: "A1" } as Pick<Attempt, "mode" | "attemptId" | "domain" | "reveal">;

describe("resumeParams", () => {
  it("carries mode + resume id", () => {
    expect(resumeParams({ ...base, mode: "quick" })).toBe("mode=quick&resume=A1");
  });
  it("carries domain for a drill", () => {
    expect(resumeParams({ ...base, mode: "drill", domain: "Design" })).toBe("mode=drill&resume=A1&domain=Design");
  });
  it("carries reveal=1 for a study run and omits it otherwise", () => {
    expect(resumeParams({ ...base, mode: "mock", reveal: true })).toBe("mode=mock&resume=A1&reveal=1");
    expect(resumeParams({ ...base, mode: "mock" })).toBe("mode=mock&resume=A1");
  });
});
