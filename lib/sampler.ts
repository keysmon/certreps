import type { CertMeta, Difficulty, Question } from "./types";
import { byDomain } from "./bank";

const MIX: Record<Difficulty, number> = { easy: 0.25, medium: 0.5, hard: 0.25 };

export function difficultyTargets(n: number): Record<Difficulty, number> {
  const raw = (Object.entries(MIX) as [Difficulty, number][]).map(([d, p]) => ({ d, exact: n * p }));
  const base = raw.map((r) => ({ d: r.d, count: Math.floor(r.exact), rem: r.exact - Math.floor(r.exact) }));
  let deficit = n - base.reduce((s, b) => s + b.count, 0);
  // Deficit <= 2 because MIX sums to 1; largest-remainder distribution wraps modularly for defensive safety.
  base.sort((a, b) => b.rem - a.rem);
  // Stable sort ties to MIX declaration order; easy wins extra slot at n === 2 mod 4 - deliberate bias.
  for (let i = 0; deficit > 0; i = (i + 1) % base.length, deficit--) base[i].count++;
  const out = { easy: 0, medium: 0, hard: 0 } as Record<Difficulty, number>;
  for (const b of base) out[b.d] = b.count;
  return out;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Weighted order without replacement (Efraimidis-Spirakis): key = U^(1/w), sort desc. */
function weightedOrder(pool: Question[], weights: Map<string, number>): Question[] {
  return pool
    .map((q) => ({ q, key: Math.random() ** (1 / Math.max(1e-9, weights.get(q.id) ?? 1)) }))
    .sort((a, b) => b.key - a.key)
    .map((x) => x.q);
}

function orderPool(pool: Question[], weights?: Map<string, number>): Question[] {
  return weights ? weightedOrder(pool, weights) : shuffle(pool);
}

/** Pick `count` from `pool` honoring 25/50/25; backfill from remaining pool when a bucket runs dry.
 *  With `weights`, ordering within buckets is weighted (missed/unseen surface more); the difficulty
 *  mix is unchanged. Without `weights`, byte-for-byte the prior uniform-shuffle behavior. */
function pickBalanced(pool: Question[], count: number, weights?: Map<string, number>): Question[] {
  pool = pool.filter((q) => !q.excludedFromPractice);
  if (count <= 0) return [];
  const targets = difficultyTargets(count);
  const buckets: Record<Difficulty, Question[]> = { easy: [], medium: [], hard: [] };
  for (const q of orderPool(pool, weights)) buckets[q.difficulty].push(q);
  const picked: Question[] = [];
  for (const d of ["easy", "medium", "hard"] as Difficulty[]) picked.push(...buckets[d].slice(0, targets[d]));
  if (picked.length < count) {
    const chosen = new Set(picked.map((q) => q.id));
    for (const q of orderPool(pool, weights)) {
      if (picked.length >= count) break;
      if (!chosen.has(q.id)) { picked.push(q); chosen.add(q.id); }
    }
  }
  return picked;
}

export function sampleMock(bank: Question[], meta: CertMeta): Question[] {
  const groups = byDomain(bank);
  const out: Question[] = [];
  for (const d of meta.domains) out.push(...pickBalanced(groups[d.name] ?? [], d.mockCount));
  if (out.length !== meta.mockQuestionCount) {
    throw new Error(`Insufficient active questions for ${meta.certId} mock`);
  }
  return shuffle(out);
}

export function sampleQuick(bank: Question[], n: number, weights?: Map<string, number>): Question[] {
  return pickBalanced(bank, Math.min(n, bank.length), weights);
}

export function sampleDrill(bank: Question[], domain: string, n: number, weights?: Map<string, number>): Question[] {
  const pool = bank.filter((q) => q.domain === domain);
  return pickBalanced(pool, Math.min(n, pool.length), weights);
}

export function questionsByIds(bank: Question[], ids: string[]): Question[] {
  const map = new Map(bank.map((q) => [q.id, q]));
  return ids.map((id) => map.get(id)).filter((q): q is Question => Boolean(q));
}
