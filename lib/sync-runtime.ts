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

// Test-only: clears the module-level debounce timers between tests so a pending timer
// from one test can never leak into the next (mirrors the report route's _resetRateLimit).
export function _resetTimers(): void {
  timers.clear();
}

/**
 * Fire-and-forget upsert of one attempt. Debounced 400ms per attemptId so a burst of
 * recordResult writes coalesces into one request; a FINISHED attempt fires immediately
 * (and cancels any still-pending debounce for that id, so the finish supersedes the last
 * in-progress save). No-ops synchronously when Supabase is unavailable. Never throws.
 */
export function queueUpsert(attempt: Attempt): void {
  if (!supabaseAvailable()) return;

  const pending = timers.get(attempt.attemptId);
  if (pending) clearTimeout(pending);

  const fire = () => {
    timers.delete(attempt.attemptId);
    void flushUpsert(attempt);
  };

  if (attempt.finishedAt !== null) {
    timers.delete(attempt.attemptId);
    fire();
  } else {
    timers.set(attempt.attemptId, setTimeout(fire, DEBOUNCE_MS));
  }
}

/** Awaits a single upsert; discovers "no session" here (needs an async getSession). Swallows all failure. */
async function flushUpsert(attempt: Attempt): Promise<void> {
  try {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    const { error } = await supabase
      .from("attempts")
      .upsert(toRow(attempt, data.session.user.id), { onConflict: "user_id,attempt_id" });
    if (error) throw error;
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
  if (!supabaseAvailable()) return;
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    const userId = data.session.user.id;

    const { data: rows, error } = await supabase.from("attempts").select("*");
    if (error) throw error;
    const cloud = ((rows ?? []) as AttemptRow[]).map(fromRow);

    const local = readAll();
    writeAll(mergeAttempts(local, cloud));

    for (const attempt of pendingUploads(local, cloud)) {
      const { error: upErr } = await supabase
        .from("attempts")
        .upsert(toRow(attempt, userId), { onConflict: "user_id,attempt_id" });
      if (upErr) throw upErr;
    }
  } catch (e) {
    console.warn("sync:", e);
  }
}
