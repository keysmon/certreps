import { describe, expect, it } from "vitest";
import { getBank, getMeta, byDomain } from "./bank";

describe("bank", () => {
  it("loads 65 valid questions with upgraded schema", () => {
    const bank = getBank();
    expect(bank.length).toBe(65);
    for (const q of bank) {
      expect(q.id).toMatch(/^aipc01-\d{4}$/);
      expect(["easy", "medium", "hard"]).toContain(q.difficulty);
      expect(q.docUrl).toMatch(/^https:\/\/(docs\.)?aws\.amazon\.com\//);
    }
  });
  it("meta domain mockCounts sum to 65", () => {
    const meta = getMeta();
    expect(meta.domains.reduce((s, d) => s + d.mockCount, 0)).toBe(65);
  });
  it("groups by domain matching meta counts availability", () => {
    const groups = byDomain(getBank());
    for (const d of getMeta().domains) {
      expect((groups[d.name] ?? []).length).toBeGreaterThanOrEqual(d.mockCount);
    }
  });
});
