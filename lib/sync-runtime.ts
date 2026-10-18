import { getSupabase, supabaseAvailable } from "@/lib/supabase/client";
import { mergeAttempts, pendingUploads, fromRow, toRow, type AttemptRow } from "./sync";
import { readAll, writeAll } from "./storage";
import type { Attempt } from "./types";

/**
 * Write-through cloud mirror for the attempt store. localStorage stays the engine's
 * single source of truth; this module is a best-effort background sync layer.
 *
 * Absolute invariant: sync must NEVER surface an error to the engine or corrupt
 * localStorage. Every path here either no-ops (unavailable / signed out) or swallows
 * its failure with console.warn("sync:", ...). localStorage is written only from a
 * successfully-merged list - a failed pull leaves it byte-identical.
 */

const DEBOUNCE_MS = 400;

// One trailing-debounce timer per attemptId; the latest queued call wins.
const timers = new Map<string, ReturnType<typeof setTimeout>>();

// A deletion invalidates pre-delete reads and prevents new writes in this browser runtime.
let generation = 0;
let paused = false;
let activeDeletions = 0;
const inFlightWrites = new Set<Promise<unknown>>();
const attemptWrites = new Map<string, Promise<unknown>>();
const latestRequests = new Map<string, number>();
let requestSequence = 0;

function current(epoch: number): boolean {
  return !paused && epoch === generation;
}

function trackWrite<T>(request: PromiseLike<T>): Promise<T> {
  const pending = Promise.resolve(request);
  inFlightWrites.add(pending);
  void pending.then(
    () => inFlightWrites.delete(pending),
    () => inFlightWrites.delete(pending),
  );
  return pending;
}

/** Serialize mutations of the same cloud row, then discard superseded snapshots. */
async function upsertInOrder(attempt: Attempt, userId: string, epoch: number, sequence: number): Promise<void> {
  const key = JSON.stringify([userId, attempt.attemptId]);
  let prior: Promise<unknown> | undefined;
  // Recheck after each wait: another ready continuation may have acquired this row first.
  while ((prior = attemptWrites.get(key))) {
    try { await prior; } catch { /* The original caller reports its own failure. */ }
    if (!current(epoch)) return;
  }
  if (!current(epoch) || (latestRequests.get(attempt.attemptId) ?? 0) !== sequence) return;
  const supabase = getSupabase();
  if (!supabase) return;
  const pending = trackWrite(supabase.from("attempts")
    .upsert(toRow(attempt, userId), { onConflict: "user_id,attempt_id" }));
  attemptWrites.set(key, pending);
  const release = () => {
    if (attemptWrites.get(key) === pending) attemptWrites.delete(key);
  };
  void pending.then(release, release);
  const { error } = await pending;
  if (error) throw error;
}

/**
 * Stop queued work synchronously, invalidate old read continuations, and wait for already
 * issued writes before DELETE. Reads need not settle: their generation is no longer valid.
 * The caller must finishSyncDeletion() in a finally block after delete/sign-out processing.
 */
export async function pauseAndDrainSync(): Promise<void> {
  activeDeletions++;
  paused = true;
  generation++;
  for (const timer of timers.values()) clearTimeout(timer);
  timers.clear();
  await Promise.allSettled([...inFlightWrites]);
}

/** Release the deletion lock, but keep uploads paused even if sign-out failed. */
export function finishSyncDeletion(): void {
  activeDeletions = Math.max(0, activeDeletions - 1);
}

/**
 * Only call after a successful new sign-in, never from an ordinary fullSync callback.
 * A full document navigation (including the dormant OAuth callback) creates a fresh runtime.
 * This boundary coordinates this browser runtime only, not other tabs or devices.
 */
export function resumeSyncAfterSignIn(): void {
  if (activeDeletions > 0) return;
  generation++;
  paused = false;
}

// Test-only: cancel actual timers, invalidate old continuations and reset the deletion boundary.
export function _resetTimers(): void {
  for (const timer of timers.values()) clearTimeout(timer);
  timers.clear();
  generation++;
  paused = false;
  activeDeletions = 0;
  inFlightWrites.clear();
  attemptWrites.clear();
  latestRequests.clear();
  requestSequence = 0;
}

/**
 * Fire-and-forget upsert of one attempt. Debounced 400ms per attemptId so a burst of
 * recordResult writes coalesces into one request; a FINISHED attempt starts immediately
 * (and cancels any still-pending debounce for that id, so the finish supersedes the last
 * in-progress save). An already-issued write for the same row must settle first. No-ops synchronously when Supabase is unavailable. Never throws.
 */
export function queueUpsert(attempt: Attempt): void {
  if (paused || !supabaseAvailable()) return;

  const epoch = generation;
  const sequence = ++requestSequence;
  latestRequests.set(attempt.attemptId, sequence);
  const pending = timers.get(attempt.attemptId);
  if (pending) clearTimeout(pending);

  const fire = () => {
    timers.delete(attempt.attemptId);
    if (current(epoch)) void flushUpsert(attempt, epoch, sequence);
  };

  if (attempt.finishedAt !== null) {
    timers.delete(attempt.attemptId);
    fire();
  } else {
    timers.set(attempt.attemptId, setTimeout(fire, DEBOUNCE_MS));
  }
}

/** Awaits a single upsert; discovers "no session" here (needs an async getSession). Swallows all failure. */
async function flushUpsert(attempt: Attempt, epoch: number, sequence: number): Promise<void> {
  try {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    if (!current(epoch) || !data.session) return;
    await upsertInOrder(attempt, data.session.user.id, epoch, sequence);
  } catch (e) {
    console.warn("sync:", e);
  }
}

/**
 * Login-time reconciliation: pull every cloud row, merge with local (Task 4's decision
 * tree), write the merged list back through storage's own serializer, then push whatever
 * local attempts are still newer than the cloud. No-ops when unavailable or signed out.
 * The pull is fully resolved BEFORE any localStorage write, so a rejected pull cannot
 * touch local state. Never throws.
 */
export async function fullSync(): Promise<void> {
  if (paused || !supabaseAvailable()) return;
  const epoch = generation;
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const { data } = await supabase.auth.getSession();
    if (!current(epoch) || !data.session) return;
    const userId = data.session.user.id;

    const { data: rows, error } = await supabase.from("attempts").select("*");
    if (!current(epoch)) return;
    if (error) throw error;
    const cloud = ((rows ?? []) as AttemptRow[]).map(fromRow);

    const local = readAll();
    const sequences = new Map(local.map((attempt) => [attempt.attemptId, latestRequests.get(attempt.attemptId) ?? 0]));
    writeAll(mergeAttempts(local, cloud));

    for (const attempt of pendingUploads(local, cloud)) {
      if (!current(epoch)) return;
      await upsertInOrder(attempt, userId, epoch, sequences.get(attempt.attemptId) ?? 0);
    }
  } catch (e) {
    console.warn("sync:", e);
  }
}
