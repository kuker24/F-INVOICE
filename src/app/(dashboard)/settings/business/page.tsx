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
      <h1 className="text-xl font-semibold">Pengaturan bisnis</h1>
      <Card>
        <CardTitle className="mb-4">Profil bisnis</CardTitle>
        <BusinessSettingsForm initial={s} />
      </Card>
    </div>
  );
}
