import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <div className="w-full max-w-md space-y-4 rounded-[24px] border border-hairline bg-paper p-6 text-center shadow-subtle">
        <p className="text-sm font-semibold tracking-tight text-ink">F-INVOICE</p>
        <h1 className="text-lg font-semibold tracking-tight text-ink">
          Halaman tidak ditemukan
        </h1>
        <p className="text-sm text-mid-gray">
          URL tidak valid atau data sudah dihapus.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <Link href="/" className={cn(buttonVariants({ size: "sm" }))}>
            Beranda
          </Link>
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
          >
            Masuk
          </Link>
        </div>
      </div>
    </div>
  );
}
