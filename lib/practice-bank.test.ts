import { createHash } from "node:crypto";
import review from "../content/aip-c01/review.json";
import { describe, expect, it } from "vitest";
import { getBank, getMeta, getPracticeBank, attemptUsesActiveQuestions } from "./bank";
import { sampleQuick, sampleDrill, sampleMock, questionsByIds } from "./sampler";

describe("reviewed practice bank", () => {
  it("excludes audited unresolved questions while preserving archive lookup", () => {
    expect(getPracticeBank().some((q) => q.id === "aipc01-0001")).toBe(false);
    expect(questionsByIds(getBank(), ["aipc01-0001"])[0].id).toBe("aipc01-0001");
  });
  it("rejects incomplete sessions with excluded or missing question IDs", () => {
    const archived = { ...getBank()[0], excludedFromPractice: true };
    expect(attemptUsesActiveQuestions({ questionIds: [archived.id] }, [archived])).toBe(false);
    expect(attemptUsesActiveQuestions({ questionIds: ["missing"] }, [archived])).toBe(false);
    const active = { ...archived, excludedFromPractice: false };
    expect(attemptUsesActiveQuestions({ questionIds: [active.id] }, [active])).toBe(true);
  });
  it("all new sampling modes exclude retired items even when given the archive", () => {
    const domain = getMeta().domains[0].name;
    const pool = getBank().filter((q) => q.domain === domain).slice(0, 12)
      .map((q, i) => ({ ...q, excludedFromPractice: i === 0 }));
    expect(sampleQuick(pool, 12)).toHaveLength(11);
    expect(sampleDrill(pool, domain, 12)).toHaveLength(11);
    const meta = { ...getMeta(), mockQuestionCount: 11, domains: [{ ...getMeta().domains[0], mockCount: 11 }] };
    const mock = sampleMock(pool, meta);
    expect(mock).toHaveLength(11);
    expect(mock.every((q) => !q.excludedFromPractice)).toBe(true);
  });
  it("every domain retains enough active questions for a full 75-question mock", () => {
    const active = getPracticeBank();
    for (const d of getMeta().domains) {
      expect(active.filter((q) => q.domain === d.name).length).toBeGreaterThanOrEqual(d.mockCount);
    }
    expect(sampleMock(active, getMeta())).toHaveLength(75);
  });
});


it("preserves every original published answer contract and accounts for every review disposition", () => {
  const archive = getBank();
  const contracts = archive.slice(0, review.reviewedOriginalCount).map(({ id, stem, options, correct }) => ({ id, stem, options, correct }));
  expect(createHash("sha256").update(JSON.stringify(contracts)).digest("hex")).toBe(review.publishedContractsSha256);
  expect(getPracticeBank()).toHaveLength(review.activeCount);
  expect(review.corrections).toHaveLength(83);
  expect(review.unresolved).toHaveLength(22);
  expect(getPracticeBank().some(q => q.id === "aipc01-0010")).toBe(false);
  for (const unresolved of review.unresolved) {
    expect(archive.find((q) => q.id === unresolved.id)?.excludedFromPractice).toBe(true);
  }
  for (const old of archive.filter((q) => q.supersededBy)) {
    expect(old.excludedFromPractice).toBe(true);
    const successor = archive.find((q) => q.id === old.supersededBy);
    expect(successor).toBeDefined();
    expect(successor?.excludedFromPractice).not.toBe(true);
    expect(successor?.domain).toBe(old.domain);
  }
});
