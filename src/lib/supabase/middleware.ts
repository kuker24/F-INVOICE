import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export type SessionContext = {
  supabase: SupabaseClient;
  user: User | null;
  supabaseResponse: NextResponse;
};

/**
 * Hobby speed: getSession() reads JWT from cookie (no Auth network RTT).
 * getUser() reserved for mutations (requireVerifiedProfile).
 * Tradeoff: revoked sessions valid until JWT exp (~1h typical).
 */
export async function updateSession(
  request: NextRequest,
): Promise<SessionContext> {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    return {
      supabase: null as unknown as SupabaseClient,
      user: null,
      supabaseResponse,
    };
  }

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return {
    supabase,
    user: session?.user ?? null,
    supabaseResponse,
  };
}
