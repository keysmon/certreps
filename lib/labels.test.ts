import { describe, expect, it } from "vitest";
import { attemptLabel } from "./labels";

describe("attemptLabel", () => {
  it("labels a study run distinctly", () => {
    expect(attemptLabel("mock", true)).toBe("Study Mock");
  });
  it("labels the exam mock and other modes with the existing words", () => {
    expect(attemptLabel("mock")).toBe("Full Mock");
    expect(attemptLabel("mock", false)).toBe("Full Mock");
    expect(attemptLabel("quick")).toBe("Quick Practice");
    expect(attemptLabel("drill")).toBe("Domain Drill");
    expect(attemptLabel("retry")).toBe("Retry Missed");
  });
  it("ignores reveal for non-mock modes", () => {
    expect(attemptLabel("quick", true)).toBe("Quick Practice");
  });
});
