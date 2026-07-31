"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { forgotPasswordAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");

    startTransition(async () => {
      const result = await forgotPasswordAction({ email });
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      setDone(true);
    });
  }

  if (done) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-mid-gray">
          Jika email terdaftar, tautan reset password akan dikirim.
        </p>
        <Link
          href="/login"
          className="text-sm font-medium text-ink underline-offset-4 hover:underline"
        >
          Kembali ke login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
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
            <Loader2 className="h-4 w-4 animate-spin" />
            Mengirim…
          </>
        ) : (
          "Kirim Tautan Reset"
        )}
      </Button>

      <Link
        href="/login"
        className="text-center text-sm text-mid-gray hover:text-ink"
      >
        Kembali ke login
      </Link>
    </form>
  );
}
