import { describe, expect, it } from "vitest";
import { listGuides, getGuide } from "./guides";

describe("guides", () => {
  it("lists the seed guide with slug and title", () => {
    const guides = listGuides("aip-c01");
    expect(guides.length).toBeGreaterThanOrEqual(1);
    const g = guides.find((x) => x.slug === "operational-efficiency-and-optimization");
    expect(g?.title).toMatch(/Operational Efficiency/);
  });
  it("returns raw markdown for a slug and null for unknown", () => {
    expect(getGuide("aip-c01", "operational-efficiency-and-optimization")).toContain("# Operational Efficiency");
    expect(getGuide("aip-c01", "nope")).toBeNull();
    expect(getGuide("aip-c01", "../../package")).toBeNull();
  });
});
