import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * True only when both public Supabase env vars are present and non-empty.
 * Every auth surface gates on this: when it is false the app degrades to v1a
 * (anonymous, localStorage-only) with no Supabase project required anywhere.
 * Read from process.env at call time (not module top level) so the value is
 * inlined by Next in the browser bundle and stubbable in tests.
 */
export function supabaseAvailable(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

let browserClient: SupabaseClient | null = null;

/**
 * Memoized browser Supabase client, or null when unavailable.
 * No client is constructed at import time - only on first call when available,
 * so importing this module never throws without env vars.
 */
export function getSupabase(): SupabaseClient | null {
  if (!supabaseAvailable()) return null;
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return browserClient;
}
