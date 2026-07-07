import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

/**
 * OAuth redirect target. Supabase sends the browser here with a `?code=...` after
 * the provider consents; we exchange it for a cookie-based session, then land the
 * user on their account (Task 6). Any failure - missing code, exchange error, or
 * Supabase unavailable (getSupabaseServer() null) - falls through to /login?error=auth.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const supabase = await getSupabaseServer();

  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/account?welcome=1", request.url));
  }

  return NextResponse.redirect(new URL("/login?error=auth", request.url));
}
