import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/profile";
import { Card, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/components/forms/profile-form";

export default async function PortalProfilePage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  return (
    <div className="mx-auto max-w-[640px] space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Profil</h1>
        <p className="text-sm text-mid-gray">Nama tampilan dan nomor telepon</p>
      </div>
      <Card>
        <CardTitle className="mb-1">{session.profile.email}</CardTitle>
        <p className="mb-4 text-xs text-mid-gray">Email tidak bisa diubah di sini</p>
        <ProfileForm
          initial={{
            full_name: session.profile.full_name,
            phone: session.profile.phone,
          }}
        />
      </Card>
    </div>
  );
}
