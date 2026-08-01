"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/browser";
import { updatePasswordAction } from "@/server/actions/auth";

export function ResetPasswordForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [ready, setReady] = useState(false);
  const [sessionOk, setSessionOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      // Recovery links put tokens in hash; exchange if present
      if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
        const hash = new URLSearchParams(window.location.hash.slice(1));
        const access_token = hash.get("access_token");
        const refresh_token = hash.get("refresh_token");
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
          // clean hash from bar
          window.history.replaceState(null, "", window.location.pathname);
        }
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!cancelled) {
        setSessionOk(!!user);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirm") ?? "");
    start(async () => {
      const res = await updatePasswordAction({ password, confirm });
      if (!res.success) {
        setError(res.error.message);
        return;
      }
      setDone(true);
      router.refresh();
    });
  }

  if (!ready) {
    return (
      <p className="flex items-center gap-2 text-sm text-mid-gray">
        <Loader2 className="h-4 w-4 animate-spin" /> Memuat sesi…
      </p>
    );
  }

  if (!sessionOk) {
    return (
      <div className="space-y-3 text-sm text-mid-gray">
        <p>
          Sesi reset tidak valid atau sudah kedaluwarsa. Minta tautan baru lewat
          lupa password, atau minta Developer set password di menu Pengguna.
        </p>
        <Link
          href="/forgot-password"
          className="font-medium text-ink underline-offset-4 hover:underline"
        >
          Lupa password
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-ink">Password berhasil diganti.</p>
        <Link
          href="/login"
          className="inline-flex h-10 w-full items-center justify-center rounded-[18px] bg-ink px-4 text-sm font-medium text-surface-alt hover:bg-ink-soft"
        >
          Ke halaman masuk
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password baru</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          disabled={pending}
          placeholder="Minimal 8 karakter"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Ulangi password</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          disabled={pending}
        />
      </div>
      {error ? (
        <p className="text-sm text-ember" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Menyimpan…
          </>
        ) : (
          "Simpan password"
        )}
      </Button>
    </form>
  );
}
