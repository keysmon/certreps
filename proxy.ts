import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAvailable } from "@/lib/supabase/client";

/**
 * Session-refresh proxy (Next 16's renamed `middleware`). Active only when
 * Supabase is configured; otherwise a pure pass-through, so the env-less app
 * behaves exactly as v1a with no Supabase project anywhere.
 */
export async function proxy(request: NextRequest) {
  if (!supabaseAvailable()) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          // Cache-control headers the client asks us to set so auth responses are never cached.
          if (headers) {
            for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
          }
        },
      },
    },
  );

  // Refresh the auth token when expired; getUser() contacts the auth server and
  // triggers the refresh, whose rotated cookies are written back via setAll above.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // Run on every path except Next internals, the report API, and static assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/report|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|txt|xml)$).*)",
  ],
};
