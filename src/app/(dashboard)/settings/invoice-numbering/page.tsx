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
        <p className="mt-1 text-xs text-mid-gray">
          <Link
            href="/settings/business"
            className="underline-offset-2 hover:underline"
          >
            ← Pengaturan bisnis
          </Link>
        </p>
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
