import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import type { AccountStatus, UserRole } from "@/types/database";
import {
  HDR_CUSTOMER,
  HDR_EMAIL,
  HDR_NAME,
  HDR_OWNER,
  HDR_PHONE,
  HDR_ROLE,
  HDR_STATUS,
  HDR_UID,
} from "@/lib/auth/request-identity";
const AUTH_PATHS = ["/login", "/forgot-password", "/reset-password"];
/** No session refresh — pure public (saves Supabase getUser RTT every hit). */
const SKIP_AUTH_PREFIXES = [
  "/i/",
  "/api/public/",
  "/api/cron/",
  "/api/webhooks/",
  "/api/health",
];

function isAuthPath(pathname: string) {
  return AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function skipAuth(pathname: string) {
  if (pathname.startsWith("/api/invoices/") && pathname.endsWith("/pdf")) {
    return true;
  }
  return SKIP_AUTH_PREFIXES.some((p) => pathname.startsWith(p));
}

function withIdentity(
  request: NextRequest,
  base: NextResponse,
  profile: {
    id: string;
    role: string;
    status: string;
    full_name: string | null;
    email: string | null;
    owner_id: string | null;
    customer_id: string | null;
    phone: string | null;
  },
) {
  // Clone request with identity headers so RSC layout skips second getUser.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(HDR_UID, profile.id);
  requestHeaders.set(HDR_ROLE, profile.role);
  requestHeaders.set(HDR_STATUS, profile.status);
  requestHeaders.set(HDR_NAME, profile.full_name ?? "");
  requestHeaders.set(HDR_EMAIL, profile.email ?? "");
  requestHeaders.set(HDR_OWNER, profile.owner_id ?? "");
  requestHeaders.set(HDR_CUSTOMER, profile.customer_id ?? "");
  requestHeaders.set(HDR_PHONE, profile.phone ?? "");

  const res = NextResponse.next({
    request: { headers: requestHeaders },
  });
  // Preserve session cookies from Supabase refresh
  base.cookies.getAll().forEach((c) => {
    res.cookies.set(c.name, c.value);
  });
  return res;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /i/ excluded from matcher — never hits middleware (CDN/ISR friendly).
  if (skipAuth(pathname)) {
    return NextResponse.next();
  }

  const { supabase, user, supabaseResponse } = await updateSession(request);

  if (!supabase) {
    return supabaseResponse;
  }

  if (isAuthPath(pathname)) {
    if (user && (pathname === "/login" || pathname === "/forgot-password")) {
      const { data: profile } = await supabase
        .from("profiles")
        .select(
          "id,role,status,full_name,email,owner_id,customer_id,phone",
        )
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
    .select("id,role,status,full_name,email,owner_id,customer_id,phone")
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

  return withIdentity(request, supabaseResponse, profile);
}

export const config = {
  // Skip static assets + public invoice HTML (ISR/CDN; rate-limit on API only).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|i/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
