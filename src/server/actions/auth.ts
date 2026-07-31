"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  checkRateLimit,
  LOGIN_LIMIT,
  RESET_LIMIT,
} from "@/lib/rate-limit";
import {
  forgotPasswordSchema,
  loginSchema,
} from "@/lib/validation/auth";
import { homePathForRole } from "@/lib/auth/profile";
import type { Profile } from "@/types/database";
import { getPublicEnv } from "@/config/public-env";

import type { ActionResult } from "@/server/errors";

function clientIp(h: Headers): string {
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

export async function loginAction(
  raw: unknown,
): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Data tidak valid.",
      },
    };
  }

  const { email, password } = parsed.data;
  const h = await headers();
  const ip = clientIp(h);
  const rl = await checkRateLimit(
    `login:${ip}:${email.toLowerCase()}`,
    LOGIN_LIMIT.limit,
    LOGIN_LIMIT.windowMs,
  );
  if (!rl.ok) {
    return {
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: `Terlalu banyak percobaan. Coba lagi dalam ${rl.retryAfterSec} detik.`,
      },
    };
  }

  const supabase = await createClient();
  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({ email, password });

  if (authError || !authData.user) {
    return {
      success: false,
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Email atau password salah.",
      },
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    return {
      success: false,
      error: {
        code: "PROFILE_MISSING",
        message: "Profil tidak ditemukan. Hubungi Developer.",
      },
    };
  }

  const p = profile as Profile;
  if (p.status !== "ACTIVE") {
    await supabase.auth.signOut();
    const msg =
      p.status === "INVITED"
        ? "Akun belum diaktifkan. Cek email undangan."
        : "Akun tidak aktif.";
    return {
      success: false,
      error: { code: "ACCOUNT_INACTIVE", message: msg },
    };
  }

  // best-effort last_login + identity cookie (Hobby: skip profiles DB on next nav)
  try {
    const admin = createAdminClient();
    await admin
      .from("profiles")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", p.id);
  } catch {
    // env may be incomplete in local UI-only runs
  }

  try {
    const { cookies } = await import("next/headers");
    const {
      encodeIdentityCookie,
      IDENTITY_COOKIE,
      identityCookieOptions,
    } = await import("@/lib/auth/identity-cookie");
    const jar = await cookies();
    jar.set(
      IDENTITY_COOKIE,
      await encodeIdentityCookie({
        id: p.id,
        role: p.role,
        status: p.status,
        full_name: p.full_name ?? "",
        email: p.email ?? "",
        owner_id: p.owner_id ?? "",
        customer_id: p.customer_id ?? "",
        phone: p.phone ?? "",
      }),
      identityCookieOptions(),
    );
  } catch {
    /* non-fatal */
  }

  return {
    success: true,
    data: { redirectTo: homePathForRole(p.role) },
  };
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  jar.set("finv_id", "", { httpOnly: true, path: "/", maxAge: 0 });
  redirect("/login");
}

export async function forgotPasswordAction(
  raw: unknown,
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Data tidak valid.",
      },
    };
  }

  const { email } = parsed.data;
  const h = await headers();
  const ip = clientIp(h);
  const rl = await checkRateLimit(
    `reset:${ip}:${email.toLowerCase()}`,
    RESET_LIMIT.limit,
    RESET_LIMIT.windowMs,
  );
  if (!rl.ok) {
    return {
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: `Terlalu banyak permintaan. Coba lagi dalam ${rl.retryAfterSec} detik.`,
      },
    };
  }

  const supabase = await createClient();
  const appUrl = getPublicEnv().NEXT_PUBLIC_APP_URL;
  // Always generic success — do not reveal whether email exists
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/reset-password`,
  });

  return { success: true, data: undefined };
}
