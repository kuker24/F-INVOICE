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
import {
  IDENTITY_COOKIE,
  decodeIdentityCookie,
  encodeIdentityCookie,
  identityCookieOptions,
} from "@/lib/auth/identity-cookie";

const AUTH_PATHS = ["/login", "/forgot-password", "/reset-password"];
/** No session — pure public. */
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

type ProfileLite = {
  id: string;
  role: string;
  status: string;
  full_name: string | null;
  email: string | null;
  owner_id: string | null;
  customer_id: string | null;
  phone: string | null;
};

function withIdentity(
  request: NextRequest,
  base: NextResponse,
  profile: ProfileLite,
  setIdCookie: boolean,
) {
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
  base.cookies.getAll().forEach((c) => {
    res.cookies.set(c.name, c.value);
  });

  if (setIdCookie) {
    res.cookies.set(
      IDENTITY_COOKIE,
      encodeIdentityCookie({
        id: profile.id,
        role: profile.role,
        status: profile.status,
        full_name: profile.full_name ?? "",
        email: profile.email ?? "",
        owner_id: profile.owner_id ?? "",
        customer_id: profile.customer_id ?? "",
        phone: profile.phone ?? "",
      }),
      identityCookieOptions(),
    );
  }
  return res;
}

function roleGate(
  role: UserRole,
  pathname: string,
  request: NextRequest,
): NextResponse | null {
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
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (skipAuth(pathname)) {
    return NextResponse.next();
  }

  // Auth pages: only check session if cookie present (skip Supabase for cold visitors).
  if (isAuthPath(pathname)) {
    const hasSb = request.cookies
      .getAll()
      .some((c) => c.name.includes("auth-token") || c.name.startsWith("sb-"));
    if (!hasSb) {
      return NextResponse.next();
    }
    const { user, supabaseResponse, supabase } = await updateSession(request);
    if (!supabase) return supabaseResponse;
    if (user && (pathname === "/login" || pathname === "/forgot-password")) {
      const cached = decodeIdentityCookie(
        request.cookies.get(IDENTITY_COOKIE)?.value,
      );
      if (cached && cached.id === user.id && cached.status === "ACTIVE") {
        const dest = cached.role === "USER" ? "/portal" : "/dashboard";
        return NextResponse.redirect(new URL(dest, request.url));
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("id,role,status,full_name,email,owner_id,customer_id,phone")
        .eq("id", user.id)
        .maybeSingle();
      if (profile && (profile.status as AccountStatus) === "ACTIVE") {
        const role = profile.role as UserRole;
        const dest = role === "USER" ? "/portal" : "/dashboard";
        const redir = NextResponse.redirect(new URL(dest, request.url));
        supabaseResponse.cookies.getAll().forEach((c) => {
          redir.cookies.set(c.name, c.value);
        });
        redir.cookies.set(
          IDENTITY_COOKIE,
          encodeIdentityCookie({
            id: profile.id,
            role: profile.role,
            status: profile.status,
            full_name: profile.full_name ?? "",
            email: profile.email ?? "",
            owner_id: profile.owner_id ?? "",
            customer_id: profile.customer_id ?? "",
            phone: profile.phone ?? "",
          }),
          identityCookieOptions(),
        );
        return redir;
      }
    }
    return supabaseResponse;
  }

  // Protected: try signed identity cookie first (0 DB, 0 Auth network).
  const cached = decodeIdentityCookie(
    request.cookies.get(IDENTITY_COOKIE)?.value,
  );
  if (cached && cached.status === "ACTIVE") {
    // Still need JWT present — cheap local getSession
    const { user, supabaseResponse, supabase } = await updateSession(request);
    if (!supabase) return supabaseResponse;
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      const redir = NextResponse.redirect(url);
      redir.cookies.set(IDENTITY_COOKIE, "", {
        ...identityCookieOptions(0),
        maxAge: 0,
      });
      return redir;
    }
    if (user.id === cached.id) {
      const gate = roleGate(cached.role as UserRole, pathname, request);
      if (gate) return gate;
      return withIdentity(
        request,
        supabaseResponse,
        {
          id: cached.id,
          role: cached.role,
          status: cached.status,
          full_name: cached.full_name,
          email: cached.email,
          owner_id: cached.owner_id || null,
          customer_id: cached.customer_id || null,
          phone: cached.phone || null,
        },
        false,
      );
    }
  }

  const { supabase, user, supabaseResponse } = await updateSession(request);
  if (!supabase) return supabaseResponse;

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
    const redir = NextResponse.redirect(url);
    redir.cookies.set(IDENTITY_COOKIE, "", {
      ...identityCookieOptions(0),
      maxAge: 0,
    });
    return redir;
  }

  const role = profile.role as UserRole;
  const gate = roleGate(role, pathname, request);
  if (gate) return gate;

  return withIdentity(request, supabaseResponse, profile as ProfileLite, true);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|i/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
