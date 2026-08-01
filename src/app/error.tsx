"use client";

import { useEffect } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <div className="w-full max-w-md space-y-4 rounded-[24px] border border-hairline bg-paper p-6 text-center shadow-subtle">
        <p className="text-sm font-semibold tracking-tight text-ink">F-INVOICE</p>
        <h1 className="text-lg font-semibold tracking-tight text-ink">
          Terjadi kesalahan
        </h1>
        <p className="text-sm text-mid-gray">
          Halaman gagal dimuat. Coba lagi atau kembali ke beranda.
        </p>
        {error.digest ? (
          <p className="font-mono text-xs text-mid-gray">Kode: {error.digest}</p>
        ) : null}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <button
            type="button"
            onClick={reset}
            className={cn(buttonVariants({ size: "sm" }))}
          >
            Coba lagi
          </button>
          <Link href="/" className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}>
            Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
