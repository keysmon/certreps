import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabaseAvailable } from "./client";

/**
 * Per-request server Supabase client for the App Router, or null when unavailable.
 * A fresh client is created per call (never memoized) so sessions are never shared
 * across requests. cookies() is async in Next 16, so this function is async too.
 */
export async function getSupabaseServer(): Promise<SupabaseClient | null> {
  if (!supabaseAvailable()) return null;

  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component, which cannot write cookies.
            // Safe to ignore: the proxy handles session refresh and writes cookies there.
          }
        },
      },
    },
  );
}
