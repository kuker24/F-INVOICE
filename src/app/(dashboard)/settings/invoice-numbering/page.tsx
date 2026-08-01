import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/profile";
import { getBusinessSettings } from "@/server/services/settings";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export default async function NumberingPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  if (session.profile.role !== "DEVELOPER") redirect("/dashboard");
  const s = await getBusinessSettings(session.profile);
  return (
    <div className="mx-auto max-w-[1280px] space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Penomoran</h1>
        <p className="text-sm text-mid-gray">
          Format nomor dokumen (yearly, row-lock)
        </p>
        <nav
          aria-label="Sub-pengaturan"
          className="mt-3 flex flex-wrap gap-2 text-sm"
        >
          <Link
            href="/settings/business"
            className="rounded-[18px] bg-canvas px-3 py-1.5 font-medium text-ink hover:bg-hairline/60"
          >
            Profil
          </Link>
          <Link
            href="/settings/payment-methods"
            className="rounded-[18px] bg-canvas px-3 py-1.5 font-medium text-ink hover:bg-hairline/60"
          >
            Metode bayar
          </Link>
          <span className="rounded-[18px] bg-ink px-3 py-1.5 font-medium text-surface-alt">
            Penomoran
          </span>
        </nav>
      </div>
      <Card>
        <CardTitle>Format aktif</CardTitle>
        <CardDescription className="mt-2">
          Invoice: {s.invoice_prefix}-YEAR-#### · Payment:{" "}
          {s.payment_prefix}-YEAR-####. Ubah prefix di Pengaturan bisnis.
        </CardDescription>
      </Card>
    </div>
  );
}
