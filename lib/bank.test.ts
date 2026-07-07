import { describe, expect, it } from "vitest";
import { getBank, getMeta, byDomain } from "./bank";

describe("bank", () => {
  it("loads a valid bank with upgraded schema (grows over time, never below mock size)", () => {
    const bank = getBank();
    expect(bank.length).toBeGreaterThanOrEqual(getMeta().mockQuestionCount);
    expect(new Set(bank.map((q) => q.id)).size).toBe(bank.length);
    for (const q of bank) {
      expect(q.id).toMatch(/^aipc01-\d{4}$/);
      expect(["easy", "medium", "hard"]).toContain(q.difficulty);
      expect(q.docUrl).toMatch(/^https:\/\/(docs\.)?aws\.amazon\.com\//);
    }
  });
  it("meta domain mockCounts sum to 65", () => {
    const meta = getMeta();
    expect(meta.domains.reduce((s, d) => s + d.mockCount, 0)).toBe(65);
    expect(getMeta().mockQuestionCount).toBe(65);
    expect(getMeta().domains.reduce((s, d) => s + d.weightPct, 0)).toBe(100);
  });
  it("groups by domain matching meta counts availability", () => {
    const groups = byDomain(getBank());
    for (const d of getMeta().domains) {
      expect((groups[d.name] ?? []).length).toBeGreaterThanOrEqual(d.mockCount);
    }
  });
});
