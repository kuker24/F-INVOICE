import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import type { AccountStatus, UserRole } from "@/types/database";

const AUTH_PATHS = ["/login", "/forgot-password", "/reset-password"];
const PUBLIC_PREFIXES = ["/i/", "/api/public/", "/api/cron/"];

function isPublic(pathname: string) {
  if (AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  // PDF may use signed query; allow route (handler enforces auth/sig)
  if (pathname.startsWith("/api/invoices/") && pathname.endsWith("/pdf")) {
    return true;
  }
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { supabase, user, supabaseResponse } = await updateSession(request);

  // Misconfigured env — do not crash edge
  if (!supabase) {
    return supabaseResponse;
  }

  // Allow public routes without profile
  if (isPublic(pathname)) {
    if (user && (pathname === "/login" || pathname === "/forgot-password")) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role,status")
        .eq("id", user.id)
        .maybeSingle();

      if (profile && (profile.status as AccountStatus) === "ACTIVE") {
        const role = profile.role as UserRole;
        const dest = role === "USER" ? "/portal" : "/dashboard";
        return NextResponse.redirect(new URL(dest, request.url));
      }
    }
    return supabaseResponse;
  }

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,status")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || (profile.status as AccountStatus) !== "ACTIVE") {
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "inactive");
    return NextResponse.redirect(url);
  }

  const role = profile.role as UserRole;
  const isPortal = pathname === "/portal" || pathname.startsWith("/portal/");
  const isDashboard =
    pathname === "/dashboard" ||
    pathname.startsWith("/customers") ||
    pathname.startsWith("/invoices") ||
    pathname.startsWith("/subscriptions") ||
    pathname.startsWith("/payments") ||
    pathname.startsWith("/products") ||
    pathname.startsWith("/users") ||
    pathname.startsWith("/templates") ||
    pathname.startsWith("/activity-log") ||
    pathname.startsWith("/settings");

  if (role === "USER" && isDashboard) {
    return NextResponse.redirect(new URL("/portal", request.url));
  }
  if ((role === "DEVELOPER" || role === "ADMIN") && isPortal) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and image optimizer.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
