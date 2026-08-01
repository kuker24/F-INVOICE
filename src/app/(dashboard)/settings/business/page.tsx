import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/profile";
import { getBusinessSettings } from "@/server/services/settings";
import { Card, CardTitle } from "@/components/ui/card";
import { BusinessSettingsForm } from "@/components/forms/business-settings-form";

export default async function BusinessSettingsPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  if (session.profile.role !== "DEVELOPER") redirect("/dashboard");
  const s = await getBusinessSettings(session.profile);
  return (
    <div className="mx-auto max-w-[1280px] space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Pengaturan bisnis
        </h1>
        <p className="text-sm text-mid-gray">
          Identitas, alamat, prefix dokumen, opsi revenue admin
        </p>
      </div>
      <nav
        aria-label="Sub-pengaturan"
        className="flex flex-wrap gap-2 text-sm"
      >
        <span className="rounded-[18px] bg-ink px-3 py-1.5 font-medium text-surface-alt">
          Profil
        </span>
        <Link
          href="/settings/payment-methods"
          className="rounded-[18px] bg-canvas px-3 py-1.5 font-medium text-ink hover:bg-hairline/60"
        >
          Metode bayar
        </Link>
        <Link
          href="/settings/invoice-numbering"
          className="rounded-[18px] bg-canvas px-3 py-1.5 font-medium text-ink hover:bg-hairline/60"
        >
          Penomoran
        </Link>
      </nav>
      <Card>
        <CardTitle className="mb-4">Profil bisnis</CardTitle>
        <BusinessSettingsForm initial={s} />
      </Card>
    </div>
  );
}
