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
      <h1 className="text-xl font-semibold">Penomoran</h1>
      <Card>
        <CardTitle>Format</CardTitle>
        <CardDescription className="mt-2">
          Invoice: {s.invoice_prefix}-YEAR-#### · Payment: {s.payment_prefix}-YEAR-####
          (yearly, row-lock). Ubah prefix di Pengaturan bisnis.
        </CardDescription>
      </Card>
    </div>
  );
}
