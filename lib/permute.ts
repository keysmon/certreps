// Deterministic, attempt-seeded option shuffling. Pure and storage-free: the same
// (attemptId, questionId, n) triple always yields the same permutation, forever - so a given
// attempt shows its options in a stable order across resume, the results recap, and past-attempt
// review, without persisting anything. All stored data (chosen indices, question.correct) stays
// canonical; these helpers only translate between canonical order and the per-attempt view order.
//
// Convention: perm[viewIndex] === canonicalIndex. The option shown at display position `viewIndex`
// is the canonical option `perm[viewIndex]`. perm is always a permutation of [0..n-1].

// FNV-1a (32-bit): a small, well-distributed string hash. Seeds the PRNG below so two nearly
// identical keys ("attempt:q1" vs "attempt:q2") land on far-apart seeds.
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// mulberry32: a tiny, fast, well-distributed 32-bit PRNG, fully determined by `seed`.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function optionPermutation(attemptId: string, questionId: string, n: number): number[] {
  const perm = Array.from({ length: n }, (_, i) => i);
  if (n <= 1) return perm;
  const rand = mulberry32(hashString(`${attemptId}:${questionId}`));
  // Fisher-Yates driven by the seeded generator.
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  return perm;
}

// Reorder a canonical array into view order: result[v] === arr[perm[v]].
export function applyPermutation<T>(arr: T[], perm: number[]): T[] {
  return perm.map((c) => arr[c]);
}

// The canonical index of the option shown at display position `viewIndex`.
export function canonicalIndex(perm: number[], viewIndex: number): number {
  return perm[viewIndex];
}

// The display position of a given canonical option (inverse of canonicalIndex).
export function viewIndex(perm: number[], canonicalIndex: number): number {
  return perm.indexOf(canonicalIndex);
}
