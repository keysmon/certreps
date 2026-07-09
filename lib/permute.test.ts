import { describe, expect, it } from "vitest";
import { optionPermutation, applyPermutation, canonicalIndex, viewIndex } from "./permute";

const sorted = (a: number[]) => [...a].sort((x, y) => x - y);

describe("optionPermutation", () => {
  it("is deterministic: same inputs always yield the same permutation", () => {
    const a = optionPermutation("attempt-1", "q42", 4);
    const b = optionPermutation("attempt-1", "q42", 4);
    expect(a).toEqual(b);
  });

  it("returns a valid permutation of [0..n-1]", () => {
    for (const n of [2, 3, 4, 5]) {
      const perm = optionPermutation("attempt-x", "q7", n);
      expect(perm).toHaveLength(n);
      expect(sorted(perm)).toEqual(Array.from({ length: n }, (_, i) => i));
    }
  });

  it("handles degenerate sizes (n = 0, 1) as the trivial permutation", () => {
    expect(optionPermutation("a", "q", 0)).toEqual([]);
    expect(optionPermutation("a", "q", 1)).toEqual([0]);
  });

  it("different questions usually produce different permutations (distribution sanity)", () => {
    const attemptId = "attempt-dist";
    const perms = Array.from({ length: 50 }, (_, i) => optionPermutation(attemptId, `q${i}`, 5).join(","));
    const distinct = new Set(perms).size;
    // 50 draws from 120 possible 5-permutations average ~41 distinct (birthday paradox). A
    // constant/degenerate seed collapses to 1-2 distinct, so >30 cleanly separates healthy from
    // broken while sitting far enough below the expectation to never flake on normal variance.
    expect(distinct).toBeGreaterThan(30);
  });

  it("different attempts usually reshuffle the same question (per-attempt, not per-question)", () => {
    const perms = Array.from({ length: 50 }, (_, i) => optionPermutation(`attempt-${i}`, "q-fixed", 5).join(","));
    expect(new Set(perms).size).toBeGreaterThan(30);
  });

  it("actually shuffles at least some inputs (not the identity for every seed)", () => {
    const identity = "0,1,2,3,4";
    const anyShuffled = Array.from({ length: 20 }, (_, i) => optionPermutation(`a${i}`, "q", 5).join(","))
      .some((p) => p !== identity);
    expect(anyShuffled).toBe(true);
  });
});

describe("applyPermutation", () => {
  it("reorders an array into view order: result[v] === arr[perm[v]]", () => {
    const perm = [2, 0, 3, 1];
    const arr = ["a", "b", "c", "d"];
    expect(applyPermutation(arr, perm)).toEqual(["c", "a", "d", "b"]);
  });

  it("composes with optionPermutation so applied[v] === arr[canonicalIndex(perm, v)]", () => {
    const perm = optionPermutation("attempt-1", "q9", 5);
    const arr = ["o0", "o1", "o2", "o3", "o4"];
    const applied = applyPermutation(arr, perm);
    applied.forEach((val, v) => expect(val).toBe(arr[canonicalIndex(perm, v)]));
  });
});

describe("canonicalIndex / viewIndex inverse mapping", () => {
  it("roundtrips both directions for every index", () => {
    const perm = optionPermutation("attempt-round", "q3", 5);
    for (let v = 0; v < perm.length; v++) {
      expect(viewIndex(perm, canonicalIndex(perm, v))).toBe(v);
    }
    for (let c = 0; c < perm.length; c++) {
      expect(canonicalIndex(perm, viewIndex(perm, c))).toBe(c);
    }
  });

  it("canonicalIndex reads perm[viewIndex]; viewIndex is its inverse", () => {
    const perm = [2, 0, 3, 1];
    expect(canonicalIndex(perm, 0)).toBe(2);
    expect(viewIndex(perm, 2)).toBe(0);
    expect(viewIndex(perm, 1)).toBe(3);
  });
});
